import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.regex.Pattern;

public class JobMatchServer {
    private static final String DB_URL = env("DB_URL", "jdbc:mysql://127.0.0.1:3306/job_matcher");
    private static final String DB_USER = env("DB_USER", "root");
    private static final String DB_PASSWORD = env("DB_PASSWORD", "");
    private static final Path WEB_ROOT = Paths.get("frontend", "dist").toAbsolutePath().normalize();
    private static final int MAX_BODY = 1_000_000;
    private static final String[] DATABASE_TABLE_NAMES = {"candidates", "candidate_skills", "job_skills", "jobs", "skill_catalog", "skills"};
    private static final String[][] SKILL_CATALOG = {
        {"Java", "Programming"}, {"Python", "Programming"}, {"C", "Programming"}, {"C++", "Programming"},
        {"C#", "Programming"}, {"JavaScript", "Programming"}, {"TypeScript", "Programming"}, {"PHP", "Programming"},
        {"R", "Programming"}, {"Kotlin", "Programming"}, {"Go", "Programming"},
        {"HTML", "Web development"}, {"CSS", "Web development"}, {"React", "Web development"}, {"Angular", "Web development"},
        {"Vue.js", "Web development"}, {"Node.js", "Web development"}, {"Express.js", "Web development"},
        {"Spring Boot", "Web development"}, {"REST API", "Web development"},
        {"SQL", "Databases"}, {"DBMS", "Databases"}, {"MySQL", "Databases"}, {"PostgreSQL", "Databases"},
        {"MongoDB", "Databases"}, {"Oracle Database", "Databases"}, {"Database Design", "Databases"},
        {"Database Normalization", "Databases"},
        {"Git", "Tools and platforms"}, {"GitHub", "Tools and platforms"}, {"Linux", "Tools and platforms"},
        {"Docker", "Tools and platforms"}, {"AWS", "Tools and platforms"}, {"Azure", "Tools and platforms"},
        {"Excel", "Tools and platforms"}, {"Power BI", "Tools and platforms"},
        {"Data Structures", "Computer science"}, {"Algorithms", "Computer science"},
        {"Object-Oriented Programming", "Computer science"}, {"Operating Systems", "Computer science"},
        {"Computer Networks", "Computer science"}, {"Software Engineering", "Computer science"},
        {"Problem Solving", "Computer science"}, {"Machine Learning", "Data and AI"},
        {"Data Analysis", "Data and AI"}, {"Data Visualization", "Data and AI"},
        {"Artificial Intelligence", "Data and AI"}, {"TensorFlow", "Data and AI"},
        {"Communication", "Professional"}, {"Teamwork", "Professional"}, {"Leadership", "Professional"},
        {"Time Management", "Professional"}, {"Critical Thinking", "Professional"}
    };

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8000;
        try (Connection connection = connect()) { initializeSkillCatalog(connection); System.out.println("Connected to MySQL database."); }
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/", JobMatchServer::api);
        server.createContext("/", JobMatchServer::staticFile);
        server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(8));
        server.start();
        System.out.println("Job Matcher is running at http://127.0.0.1:" + port);
    }

    private static String env(String key, String fallback) { String value = System.getenv(key); return value == null ? fallback : value; }
    private static Connection connect() throws SQLException { return DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD); }
    private static Map<String,Object> map(Object... values) { Map<String,Object> result = new LinkedHashMap<>(); for (int i=0;i<values.length;i+=2) result.put((String)values[i], values[i+1]); return result; }

    private static void api(HttpExchange exchange) throws IOException {
        try {
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod();
            if (path.equals("/api/health") && method.equals("GET")) send(exchange, 200, map("ok", true, "database", "connected"));
            else if (path.equals("/api/overview") && method.equals("GET")) send(exchange, 200, overview());
            else if (path.equals("/api/database/tables") && method.equals("GET")) send(exchange, 200, databaseTables());
            else if (path.equals("/api/jobs") && method.equals("DELETE")) send(exchange, 200, deleteSearchHistory());
            else if (path.equals("/api/skills") && method.equals("GET")) send(exchange, 200, map("skills", skillCatalog()));
            else if (path.equals("/api/candidates") && method.equals("GET")) send(exchange, 200, map("candidates", candidates()));
            else if (path.equals("/api/candidates") && method.equals("POST")) send(exchange, 201, addCandidate(body(exchange)));
            else if (path.startsWith("/api/candidates/") && method.equals("DELETE")) { deleteCandidate(Integer.parseInt(path.substring("/api/candidates/".length()))); send(exchange, 200, map("ok", true)); }
            else if (path.equals("/api/match") && method.equals("POST")) send(exchange, 200, match(body(exchange)));
            else send(exchange, 404, map("error", "That API route does not exist."));
        } catch (IllegalArgumentException e) { send(exchange, 400, map("error", e.getMessage())); }
        catch (SQLException e) { send(exchange, 500, map("error", "Database request failed: " + e.getMessage())); }
        catch (Exception e) { send(exchange, 500, map("error", "Request could not be completed.")); e.printStackTrace(); }
    }

    private static Map<String,Object> overview() throws SQLException {
        try (Connection c=connect(); Statement s=c.createStatement()) {
            Map<String,Object> result=new LinkedHashMap<>();
            result.put("candidateCount", count(s,"candidates")); result.put("skillCount", activeSkillCount(s)); result.put("jobCount", count(s,"jobs"));
            try (ResultSet rs=s.executeQuery("SELECT job_id,title,created_at FROM jobs ORDER BY job_id DESC LIMIT 5")) {
                List<Map<String,Object>> recent=new ArrayList<>();
                while(rs.next()) recent.add(map("id",rs.getInt("job_id"),"title",rs.getString("title"),"createdAt",rs.getTimestamp("created_at").toString()));
                result.put("recentJobs",recent);
            }
            return result;
        }
    }
    private static int count(Statement statement,String table) throws SQLException { try(ResultSet rs=statement.executeQuery("SELECT COUNT(*) FROM "+table)){rs.next();return rs.getInt(1);} }
    private static int activeSkillCount(Statement statement) throws SQLException { try(ResultSet rs=statement.executeQuery("SELECT COUNT(DISTINCT cs.skill_id) FROM candidate_skills cs JOIN skills s ON s.skill_id=cs.skill_id JOIN skill_catalog catalog ON catalog.skill_name=s.skill_name")){rs.next();return rs.getInt(1);} }

    private static Map<String,Object> databaseTables() throws SQLException {
        List<Map<String,Object>> tables = new ArrayList<>();
        try (Connection connection = connect(); Statement statement = connection.createStatement()) {
            for (String tableName : DATABASE_TABLE_NAMES) {
                List<Map<String,Object>> columns = new ArrayList<>();
                List<Map<String,Object>> rows = new ArrayList<>();
                try (ResultSet result = statement.executeQuery("SELECT * FROM `" + tableName + "`")) {
                    ResultSetMetaData metadata = result.getMetaData();
                    int columnCount = metadata.getColumnCount();
                    for (int column = 1; column <= columnCount; column++) {
                        columns.add(map("name", metadata.getColumnLabel(column), "type", metadata.getColumnTypeName(column)));
                    }
                    while (result.next()) {
                        Map<String,Object> row = new LinkedHashMap<>();
                        for (int column = 1; column <= columnCount; column++) {
                            row.put(metadata.getColumnLabel(column), databaseValue(result.getObject(column)));
                        }
                        rows.add(row);
                    }
                }
                tables.add(map("name", tableName, "columns", columns, "rows", rows, "rowCount", rows.size()));
            }
        }
        return map("tables", tables);
    }

    private static Object databaseValue(Object value) {
        if (value instanceof Timestamp timestamp) return timestamp.toLocalDateTime().toString();
        if (value instanceof java.sql.Date date) return date.toLocalDate().toString();
        if (value instanceof Time time) return time.toLocalTime().toString();
        if (value instanceof byte[] bytes) return Base64.getEncoder().encodeToString(bytes);
        if (value instanceof java.time.temporal.TemporalAccessor temporal) return temporal.toString();
        return value;
    }

    private static Map<String,Object> deleteSearchHistory() throws SQLException {
        try (Connection connection = connect()) {
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                int deletedLinks = statement.executeUpdate("DELETE FROM job_skills");
                int deletedJobs = statement.executeUpdate("DELETE FROM jobs");
                connection.commit();
                return map("ok", true, "deletedJobs", deletedJobs, "deletedSkillLinks", deletedLinks);
            } catch (SQLException error) {
                connection.rollback();
                throw error;
            }
        }
    }

    private static void initializeSkillCatalog(Connection c) throws SQLException {
        try (Statement st = c.createStatement()) {
            st.executeUpdate("CREATE TABLE IF NOT EXISTS skill_catalog (catalog_id INT PRIMARY KEY AUTO_INCREMENT, skill_name VARCHAR(80) NOT NULL UNIQUE, category VARCHAR(60) NOT NULL)");
        }
        try (PreparedStatement ps = c.prepareStatement("INSERT IGNORE INTO skill_catalog(skill_name,category) VALUES (?,?)")) {
            for (String[] item : SKILL_CATALOG) { ps.setString(1, item[0]); ps.setString(2, item[1]); ps.addBatch(); }
            ps.executeBatch();
        }
    }

    private static List<Map<String,Object>> skillCatalog() throws SQLException {
        List<Map<String,Object>> result = new ArrayList<>();
        try (Connection c=connect(); Statement st=c.createStatement(); ResultSet rs=st.executeQuery("SELECT skill_name,category FROM skill_catalog ORDER BY category,skill_name")) {
            while (rs.next()) result.add(map("name",rs.getString("skill_name"),"category",rs.getString("category")));
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String,Object>> candidates() throws SQLException {
        List<Map<String,Object>> result=new ArrayList<>();
        String sql="SELECT c.candidate_id,c.name,c.email,catalog.skill_name FROM candidates c LEFT JOIN candidate_skills cs ON c.candidate_id=cs.candidate_id LEFT JOIN skills s ON cs.skill_id=s.skill_id LEFT JOIN skill_catalog catalog ON catalog.skill_name=s.skill_name ORDER BY c.candidate_id DESC,catalog.skill_name";
        try(Connection c=connect();Statement st=c.createStatement();ResultSet rs=st.executeQuery(sql)){
            Map<Integer,Map<String,Object>> byId=new LinkedHashMap<>();
            while(rs.next()){
                int id=rs.getInt("candidate_id");
                Map<String,Object> item=byId.computeIfAbsent(id,k->{Map<String,Object> m=map("id",id,"name",rsString(rs,"name"),"email",rsString(rs,"email"),"skills",new ArrayList<String>());return m;});
                String skill=rs.getString("skill_name"); if(skill!=null)((List<String>)item.get("skills")).add(skill);
            }
            result.addAll(byId.values());
        }
        return result;
    }
    private static String rsString(ResultSet rs,String column){try{return rs.getString(column);}catch(SQLException e){throw new RuntimeException(e);}}

    private static Map<String,Object> addCandidate(Map<String,Object> data) throws SQLException {
        String name=text(data,"name").trim(), email=text(data,"email").trim();
        if(name.isEmpty()) throw new IllegalArgumentException("Enter the candidate's name.");
        if(!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw new IllegalArgumentException("Enter a valid email address.");
        Object raw=data.get("skills"); if(!(raw instanceof List<?> list)) throw new IllegalArgumentException("Enter one or more skills.");
        LinkedHashSet<String> skills=new LinkedHashSet<>(); for(Object item:list){String skill=String.valueOf(item).trim();if(!skill.isEmpty())skills.add(skill);}
        if(skills.isEmpty()) throw new IllegalArgumentException("Add at least one skill to the profile.");
        try(Connection c=connect()){
            LinkedHashSet<String> approvedSkills=new LinkedHashSet<>();
            for(String skill:skills){String canonical=approvedSkill(c,skill);if(canonical==null)throw new IllegalArgumentException("“"+skill+"” is not an approved skill. Choose skills from the catalog shown in the form.");approvedSkills.add(canonical);}
            c.setAutoCommit(false);
            try{
                int candidateId;
                try(PreparedStatement ps=c.prepareStatement("INSERT INTO candidates(name,email) VALUES (?,?)",Statement.RETURN_GENERATED_KEYS)){
                    ps.setString(1,name);ps.setString(2,email);ps.executeUpdate();try(ResultSet keys=ps.getGeneratedKeys()){keys.next();candidateId=keys.getInt(1);}
                }
                for(String skill:approvedSkills){int skillId=ensureSkill(c,skill);try(PreparedStatement ps=c.prepareStatement("INSERT IGNORE INTO candidate_skills(candidate_id,skill_id) VALUES (?,?)")){ps.setInt(1,candidateId);ps.setInt(2,skillId);ps.executeUpdate();}}
                c.commit(); return map("id",candidateId,"name",name,"email",email,"skills",new ArrayList<>(approvedSkills));
            }catch(Exception e){c.rollback();if(e instanceof SQLException se && se.getErrorCode()==1062)throw new IllegalArgumentException("That email is already in the candidate list.");throw e;}
        }
    }
    private static String approvedSkill(Connection c,String name)throws SQLException{
        try(PreparedStatement ps=c.prepareStatement("SELECT skill_name FROM skill_catalog WHERE LOWER(skill_name)=LOWER(?)")){ps.setString(1,name);try(ResultSet rs=ps.executeQuery()){return rs.next()?rs.getString(1):null;}}
    }
    private static int ensureSkill(Connection c,String name)throws SQLException{
        try(PreparedStatement ps=c.prepareStatement("SELECT skill_id FROM skills WHERE LOWER(skill_name)=LOWER(?)")){ps.setString(1,name);try(ResultSet rs=ps.executeQuery()){if(rs.next())return rs.getInt(1);}}
        try(PreparedStatement ps=c.prepareStatement("INSERT INTO skills(skill_name) VALUES (?)",Statement.RETURN_GENERATED_KEYS)){ps.setString(1,name);ps.executeUpdate();try(ResultSet rs=ps.getGeneratedKeys()){rs.next();return rs.getInt(1);}}
    }
    private static void deleteCandidate(int id)throws SQLException{try(Connection c=connect();PreparedStatement ps=c.prepareStatement("DELETE FROM candidates WHERE candidate_id=?")){ps.setInt(1,id);if(ps.executeUpdate()==0)throw new IllegalArgumentException("Candidate was not found.");}}

    private static Map<String,Object> match(Map<String,Object> data)throws SQLException{
        String title=text(data,"title").trim(), description=text(data,"description").trim();
        if(title.isEmpty())throw new IllegalArgumentException("Enter a job title.");
        if(description.length()<20)throw new IllegalArgumentException("Add a little more detail to the job description (at least 20 characters).");
        Map<Integer,String> detected=new LinkedHashMap<>();
        try(Connection c=connect();Statement st=c.createStatement();ResultSet rs=st.executeQuery("SELECT DISTINCT s.skill_id,catalog.skill_name FROM skills s JOIN skill_catalog catalog ON catalog.skill_name=s.skill_name JOIN candidate_skills cs ON cs.skill_id=s.skill_id ORDER BY catalog.skill_name")){
            while(rs.next()){String skill=rs.getString("skill_name");Pattern p=Pattern.compile("(?i)(?<![a-z0-9+#.])"+Pattern.quote(skill)+"(?![a-z0-9+#.])");if(p.matcher(description).find())detected.put(rs.getInt("skill_id"),skill);}
        }
        if(detected.isEmpty())throw new IllegalArgumentException("No known skills were found. Add candidate profiles with skills first.");
        int jobId;
        try(Connection c=connect()){
            c.setAutoCommit(false);
            try(PreparedStatement ps=c.prepareStatement("INSERT INTO jobs(title,description) VALUES (?,?)",Statement.RETURN_GENERATED_KEYS)){
                ps.setString(1,title);ps.setString(2,description);ps.executeUpdate();try(ResultSet keys=ps.getGeneratedKeys()){keys.next();jobId=keys.getInt(1);}
            }
            try(PreparedStatement ps=c.prepareStatement("INSERT INTO job_skills(job_id,skill_id) VALUES (?,?)")){for(int id:detected.keySet()){ps.setInt(1,jobId);ps.setInt(2,id);ps.addBatch();}ps.executeBatch();}
            c.commit();
        }
        List<Map<String,Object>> matches=new ArrayList<>();
        String query="SELECT c.candidate_id,c.name,c.email,COUNT(cs.skill_id) AS matched FROM candidates c LEFT JOIN candidate_skills cs ON c.candidate_id=cs.candidate_id AND cs.skill_id IN ("+String.join(",",Collections.nCopies(detected.size(),"?"))+ ") GROUP BY c.candidate_id,c.name,c.email ORDER BY matched DESC,c.name";
        try(Connection c=connect();PreparedStatement ps=c.prepareStatement(query)){
            int n=1;for(int id:detected.keySet())ps.setInt(n++,id);
            try(ResultSet rs=ps.executeQuery()){
                while(rs.next()){
                    int matched=rs.getInt("matched");List<String> matchedNames=new ArrayList<>();
                    String skillQuery="SELECT catalog.skill_name FROM candidate_skills cs JOIN skills s ON s.skill_id=cs.skill_id JOIN skill_catalog catalog ON catalog.skill_name=s.skill_name WHERE cs.candidate_id=? AND cs.skill_id IN ("+String.join(",",Collections.nCopies(detected.size(),"?"))+ ") ORDER BY catalog.skill_name";
                    try(PreparedStatement detail=c.prepareStatement(skillQuery)){detail.setInt(1,rs.getInt("candidate_id"));int p=2;for(int id:detected.keySet())detail.setInt(p++,id);try(ResultSet sr=detail.executeQuery()){while(sr.next())matchedNames.add(sr.getString(1));}}
                    double score=detected.isEmpty()?0:Math.round(matched*1000.0/detected.size())/10.0;
                    matches.add(map("id",rs.getInt("candidate_id"),"name",rs.getString("name"),"email",rs.getString("email"),"matched",matched,"total",detected.size(),"score",score,"matchedSkills",matchedNames));
                }
            }
        }
        return map("jobId",jobId,"title",title,"extractedSkills",new ArrayList<>(detected.values()),"matches",matches);
    }
    private static String text(Map<String,Object> data,String key){Object value=data.get(key);return value==null?"":String.valueOf(value);}
    @SuppressWarnings("unchecked") private static Map<String,Object> body(HttpExchange exchange)throws IOException{
        byte[] bytes=exchange.getRequestBody().readNBytes(MAX_BODY+1);if(bytes.length>MAX_BODY)throw new IllegalArgumentException("Request is too large.");
        try{return Json.object(Json.parse(new String(bytes,StandardCharsets.UTF_8)));}catch(RuntimeException e){throw new IllegalArgumentException("Request body must be valid JSON.");}
    }
    private static void send(HttpExchange exchange,int status,Object data)throws IOException{
        byte[] bytes=Json.stringify(data).getBytes(StandardCharsets.UTF_8);exchange.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");exchange.getResponseHeaders().set("Cache-Control","no-store");exchange.getResponseHeaders().set("X-Content-Type-Options","nosniff");exchange.sendResponseHeaders(status,bytes.length);try(OutputStream out=exchange.getResponseBody()){out.write(bytes);}
    }
    private static void staticFile(HttpExchange exchange)throws IOException{
        String path=URLDecoder.decode(exchange.getRequestURI().getPath(),StandardCharsets.UTF_8);if(path.equals("/"))path="/index.html";
        Path file=WEB_ROOT.resolve(path.substring(1)).normalize();
        if(!file.startsWith(WEB_ROOT)||!Files.isRegularFile(file))file=WEB_ROOT.resolve("index.html");
        if(!Files.isRegularFile(file)){byte[] message="Frontend build not found. Run the frontend build first.".getBytes(StandardCharsets.UTF_8);exchange.sendResponseHeaders(404,message.length);try(OutputStream out=exchange.getResponseBody()){out.write(message);}return;}
        String type=Files.probeContentType(file);if(type==null)type="application/octet-stream";if(file.toString().endsWith(".js"))type="text/javascript; charset=utf-8";if(file.toString().endsWith(".css"))type="text/css; charset=utf-8";if(file.toString().endsWith(".woff2"))type="font/woff2";if(file.toString().endsWith(".woff"))type="font/woff";if(file.toString().endsWith(".svg"))type="image/svg+xml";
        byte[] bytes=Files.readAllBytes(file);exchange.getResponseHeaders().set("Content-Type",type);exchange.getResponseHeaders().set("X-Content-Type-Options","nosniff");exchange.sendResponseHeaders(200,bytes.length);try(OutputStream out=exchange.getResponseBody()){out.write(bytes);}
    }
}





