import java.util.*;

/** Small JSON codec used by the local HTTP API. */
public final class Json {
    private Json() {}

    public static String stringify(Object value) {
        if (value == null) return "null";
        if (value instanceof Boolean || value instanceof Number) return value.toString();
        if (value instanceof CharSequence text) {
            StringBuilder out = new StringBuilder("\"");
            for (char c : text.toString().toCharArray()) {
                switch (c) {
                    case '"' -> out.append("\\\"");
                    case '\\' -> out.append("\\\\");
                    case '\n' -> out.append("\\n");
                    case '\r' -> out.append("\\r");
                    case '\t' -> out.append("\\t");
                    default -> { if (c < 32) out.append(String.format("\\u%04x", (int)c)); else out.append(c); }
                }
            }
            return out.append('"').toString();
        }
        if (value instanceof Map<?, ?> map) {
            StringJoiner parts = new StringJoiner(",", "{", "}");
            map.forEach((key, item) -> parts.add(stringify(String.valueOf(key)) + ":" + stringify(item)));
            return parts.toString();
        }
        if (value instanceof Iterable<?> items) {
            StringJoiner parts = new StringJoiner(",", "[", "]");
            for (Object item : items) parts.add(stringify(item));
            return parts.toString();
        }
        throw new IllegalArgumentException("Unsupported JSON value");
    }

    public static Object parse(String text) {
        Parser parser = new Parser(text);
        Object result = parser.value();
        parser.space();
        if (parser.index != text.length()) throw new IllegalArgumentException("Unexpected text after JSON value");
        return result;
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> object(Object value) {
        if (!(value instanceof Map<?, ?>)) throw new IllegalArgumentException("Expected a JSON object");
        return (Map<String, Object>) value;
    }

    private static final class Parser {
        private final String text;
        private int index;
        private int depth;
        Parser(String text) { this.text = text; }
        void space() { while (index < text.length() && Character.isWhitespace(text.charAt(index))) index++; }
        boolean take(char wanted) { space(); if (index < text.length() && text.charAt(index) == wanted) { index++; return true; } return false; }
        char current() { if (index >= text.length()) throw new IllegalArgumentException("Incomplete JSON"); return text.charAt(index); }
        Object value() {
            space();
            if (++depth > 32) throw new IllegalArgumentException("JSON nesting is too deep");
            try {
                char c = current();
                if (c == '"') return string();
                if (c == '{') {
                    index++; Map<String, Object> result = new LinkedHashMap<>();
                    if (take('}')) return result;
                    do {
                        space(); if (current() != '"') throw new IllegalArgumentException("Expected JSON key");
                        String key = string(); if (!take(':')) throw new IllegalArgumentException("Expected colon");
                        if (result.containsKey(key)) throw new IllegalArgumentException("Duplicate JSON key");
                        result.put(key, value()); if (take('}')) return result;
                    } while (take(','));
                    throw new IllegalArgumentException("Invalid JSON object");
                }
                if (c == '[') {
                    index++; List<Object> result = new ArrayList<>();
                    if (take(']')) return result;
                    do { result.add(value()); if (take(']')) return result; } while (take(','));
                    throw new IllegalArgumentException("Invalid JSON array");
                }
                if (text.startsWith("true", index)) { index += 4; return true; }
                if (text.startsWith("false", index)) { index += 5; return false; }
                if (text.startsWith("null", index)) { index += 4; return null; }
                int start = index;
                if (c == '-') index++;
                while (index < text.length() && Character.isDigit(text.charAt(index))) index++;
                if (index < text.length() && text.charAt(index) == '.') { index++; while (index < text.length() && Character.isDigit(text.charAt(index))) index++; }
                if (start == index) throw new IllegalArgumentException("Invalid JSON value");
                try { return Double.parseDouble(text.substring(start, index)); }
                catch (NumberFormatException e) { throw new IllegalArgumentException("Invalid number"); }
            } finally { depth--; }
        }
        String string() {
            if (!take('"')) throw new IllegalArgumentException("Expected a string");
            StringBuilder result = new StringBuilder();
            while (index < text.length()) {
                char c = text.charAt(index++);
                if (c == '"') return result.toString();
                if (c < 32) throw new IllegalArgumentException("Control character in JSON string");
                if (c != '\\') { result.append(c); continue; }
                if (index >= text.length()) throw new IllegalArgumentException("Invalid string escape");
                c = text.charAt(index++);
                switch (c) {
                    case '"', '\\', '/' -> result.append(c);
                    case 'n' -> result.append('\n'); case 'r' -> result.append('\r'); case 't' -> result.append('\t');
                    case 'b' -> result.append('\b'); case 'f' -> result.append('\f');
                    case 'u' -> { if (index + 4 > text.length()) throw new IllegalArgumentException("Invalid Unicode escape"); try { result.append((char) Integer.parseInt(text.substring(index, index + 4), 16)); } catch (NumberFormatException e) { throw new IllegalArgumentException("Invalid Unicode escape"); } index += 4; }
                    default -> throw new IllegalArgumentException("Invalid string escape");
                }
            }
            throw new IllegalArgumentException("Unclosed JSON string");
        }
    }
}
