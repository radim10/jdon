# JDON — JSON-Delimited Object Notation

**JDON** is a compact, LLM-native data format designed for structured data.  
Inspired by JSON, JDON uses **path-based keys** and **columnar arrays** to reduce token usage while remaining human-readable and machine-parsable.

## Key Features

- **LLM-friendly** — predictable patterns and flattened objects make parsing and generation easy for AI models.
- **Token-efficient** — columnar arrays and minimal punctuation drastically reduce token count.
- **Human-readable** — simpler than JSON for large datasets, without deep nesting or unnecessary quotes.
- **Columnar arrays** — perfect for arrays of objects, reducing repetition.

---

## JDON vs JSON

### Example JSON

```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" },
    { "id": 3, "name": "Charlie", "role": "user" }
  ],
  "meta": {
    "version": 2,
    "created": "2025-01-15"
  },
  "tags": ["admin", "dev", "ops"]
}
```

### Example JDON

```jdon
meta:{
  version:2|
  created:2025-01-15
}|
tags:[admin,dev,ops]|
users:[
  id:1,2,3|
  name:Alice,Bob,Charlie|
  role:admin,user,user
]
```

#### Without formatting

```
meta:{version:2|created:2025-01-15}|tags:[admin,dev,ops]|users:[id:1,2,3|name:Alice,Bob,Charlie|role:admin,user,user]
```

## JDON: Handling Special Characters & Quoting

- **Simple string**  
  JSON: `"name": "Alice"`  
  JDON: `name:Alice`  
  _No quotes needed for plain strings_

- **String with space**  
  JSON: `"title": "Hello World"`  
  JDON: `title:"Hello World"`  
  _Wrap in quotes when spaces are present_

- **String with pipe**  
  JSON: `"notes": "Alice | Bob"`  
  JDON: `notes:"Alice | Bob"`  
  _Pipe inside value must be quoted_

- **String with colon**  
  JSON: `"key": "a:b"`  
  JDON: `key:"a:b"`  
  _Colon inside value must be quoted_

- **String with braces**  
  JSON: `"desc": "Use {curly}"`  
  JDON: `desc:"Use {curly}"`  
  _Braces inside value must be quoted_

- **String with brackets**  
  JSON: `"tags": "[admin,dev]"`  
  JDON: `tags:"[admin,dev]"`  
  _Brackets inside value must be quoted_

- **String with quotes**  
  JSON: `"quote": "He said \"hi\""`  
  JDON: `quote:"He said \"hi\""`  
  _Escape internal quotes with backslash_

- **Columnar array with comma**  
  JSON: `[ "A,B", "C,D" ]`  
  JDON: `values:["A,B","C,D"]`  
  _Comma inside array element must be quoted_

- **Columnar array with pipe**  
  JSON: `[ "A|B", "C|D" ]`  
  JDON: `values:["A|B","C|D"]`  
  _Pipe inside array element must be quoted_
