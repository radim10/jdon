/**
 * JDON Parser - JSON-Delimited Object Notation
 * Supports columnar array format for extreme token efficiency
 */

class JDONParser {
  parse(input) {
    input = input.trim();

    if (!input) return null;

    // Handle objects
    if (input.startsWith("{")) {
      return this.parseObject(input);
    }

    // Handle arrays
    if (input.startsWith("[")) {
      return this.parseArray(input);
    }

    // Handle pipe-delimited format (top-level)
    if (input.includes("|") && input.includes(":")) {
      return this.parsePipeDelimited(input);
    }

    // Single value
    return this.parseValue(input);
  }

  parsePipeDelimited(input) {
    const obj = {};
    const pairs = this.splitByPipe(input);

    for (const pair of pairs) {
      if (!pair.trim()) continue;

      const colonIdx = this.findTopLevelColon(pair);
      if (colonIdx === -1) continue;

      const key = pair.substring(0, colonIdx).trim();
      const value = pair.substring(colonIdx + 1).trim();

      obj[key] = this.parseValue(value);
    }

    return obj;
  }

  parseObject(input) {
    input = input.trim();

    if (!input.startsWith("{") || !input.endsWith("}")) {
      throw new Error("Invalid object syntax");
    }

    const content = input.slice(1, -1).trim();

    if (!content) return {};

    return this.parsePipeDelimited(content);
  }

  parseArray(input) {
    input = input.trim();

    if (!input.startsWith("[") || !input.endsWith("]")) {
      throw new Error("Invalid array syntax");
    }

    const content = input.slice(1, -1).trim();

    if (!content) return [];

    // Check if it's columnar format (contains pipes and colons)
    if (content.includes("|") && content.includes(":")) {
      return this.parseColumnarArray(content);
    }

    // Standard array format
    const items = this.splitArrayItems(content);
    return items
      .map((item) => this.parseValue(item.trim()))
      .filter((v) => v !== undefined);
  }

  parseColumnarArray(input) {
    // Parse columnar format: key:val1,val2,val3|key:val1,val2,val3
    const columns = {};
    const pairs = this.splitByPipe(input);

    for (const pair of pairs) {
      if (!pair.trim()) continue;

      const colonIdx = this.findTopLevelColon(pair);
      if (colonIdx === -1) continue;

      const key = pair.substring(0, colonIdx).trim();
      const valuesStr = pair.substring(colonIdx + 1).trim();

      // Split values by comma
      const values = this.splitArrayItems(valuesStr);
      columns[key] = values.map((v) => this.parseValue(v.trim()));
    }

    // Convert columnar to row format
    const keys = Object.keys(columns);
    if (keys.length === 0) return [];

    const rowCount = columns[keys[0]].length;
    const result = [];

    for (let i = 0; i < rowCount; i++) {
      const row = {};
      for (const key of keys) {
        row[key] = columns[key][i];
      }
      result.push(row);
    }

    return result;
  }

  parseValue(value) {
    value = value.trim();

    if (!value) return null;

    if (value === "null") return null;
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "undefined") return undefined;
    if (value === "NaN") return NaN;
    if (value === "Infinity") return Infinity;
    if (value === "-Infinity") return -Infinity;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return this.unescapeString(value.slice(1, -1));
    }

    if (value.startsWith("{")) {
      return this.parseObject(value);
    }

    if (value.startsWith("[")) {
      return this.parseArray(value);
    }

    if (/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
      const num = parseFloat(value);
      if (Object.is(num, -0)) return -0;
      return num;
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return value;
    }

    return value;
  }

  splitByPipe(input) {
    const parts = [];
    let current = "";
    let depth = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const prevChar = input[i - 1];

      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === "{" || char === "[") depth++;
        if (char === "}" || char === "]") depth--;

        if (char === "|" && depth === 0) {
          parts.push(current);
          current = "";
          continue;
        }
      }

      current += char;
    }

    if (current) parts.push(current);
    return parts;
  }

  splitArrayItems(input) {
    const parts = [];
    let current = "";
    let depth = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const prevChar = input[i - 1];

      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === "{" || char === "[") depth++;
        if (char === "}" || char === "]") depth--;

        if (char === "," && depth === 0) {
          if (current.trim()) parts.push(current);
          current = "";
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) parts.push(current);
    return parts;
  }

  findTopLevelColon(input) {
    let depth = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const prevChar = input[i - 1];

      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === "{" || char === "[") depth++;
        if (char === "}" || char === "]") depth--;

        if (char === ":" && depth === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  unescapeString(str) {
    return str
      .replace(/\\\\/g, "\x00")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      .replace(/\x00/g, "\\");
  }

  stringify(obj, options = {}) {
    const { pretty = false, columnar = true } = options;
    return this.stringifyValue(obj, 0, pretty, columnar);
  }

  stringifyValue(value, depth, pretty, columnar) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "boolean") return String(value);
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";

    if (typeof value === "number") {
      if (Object.is(value, -0)) return "-0";
      return String(value);
    }

    if (typeof value === "string") {
      if (this.needsQuoting(value)) {
        return `"${this.escapeString(value)}"`;
      }
      return value;
    }

    // Arrays - check if columnar format applies
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";

      // Check if array of objects with same keys (columnar candidate)
      if (columnar && value.length > 0 && this.isArrayOfObjects(value)) {
        return this.stringifyColumnar(value, depth, pretty);
      }

      // Standard array format
      const items = value.map((item) =>
        this.stringifyValue(item, depth + 1, pretty, columnar)
      );
      return `[${items.join(",").replace(/\|/g, ",")}]`;
    }

    // Objects
    if (typeof value === "object") {
      const entries = Object.entries(value);
      if (entries.length === 0) return "{}";

      const pairs = entries.map(([key, val]) => {
        return `${key}:${this.stringifyValue(
          val,
          depth + 1,
          pretty,
          columnar
        )}`;
      });

      if (pretty && depth === 0) {
        return pairs.join("|\n");
      } else if (pretty) {
        const indent = "\n" + "  ".repeat(depth + 1);
        const closeIndent = "\n" + "  ".repeat(depth);
        return `{${indent}${pairs.join("|" + indent)}${closeIndent}}`;
      } else {
        return `{${pairs.join("|")}}`;
      }
    }

    return String(value);
  }

  isArrayOfObjects(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return false;

    // Check if all items are objects (not arrays or primitives)
    if (
      !arr.every(
        (item) => item && typeof item === "object" && !Array.isArray(item)
      )
    ) {
      return false;
    }

    // Check if all objects have the same keys
    const firstKeys = Object.keys(arr[0]).sort();
    return arr.every((item) => {
      const keys = Object.keys(item).sort();
      return (
        keys.length === firstKeys.length &&
        keys.every((key, i) => key === firstKeys[i])
      );
    });
  }

  stringifyColumnar(arr, depth, pretty) {
    if (arr.length === 0) return "[]";

    const keys = Object.keys(arr[0]);
    const columns = [];

    for (const key of keys) {
      const values = arr.map((obj) =>
        this.stringifyValue(obj[key], depth + 1, false, false)
      );
      columns.push(`${key}:${values.join(",")}`);
    }

    if (pretty) {
      const indent = "\n  ";
      return `[${indent}${columns.join("|" + indent)}\n]`;
    } else {
      return `[${columns.join("|")}]`;
    }
  }

  needsQuoting(str) {
    return (
      str.includes(":") ||
      str.includes("|") ||
      str.includes(",") ||
      str.includes(" ") ||
      str.includes("{") ||
      str.includes("}") ||
      str.includes("[") ||
      str.includes("]") ||
      str.includes('"') ||
      str.includes("'") ||
      str.includes("\n") ||
      str.includes("\t")
    );
  }

  escapeString(str) {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
        return "\\u" + ("0000" + char.charCodeAt(0).toString(16)).slice(-4);
      });
  }

  fromJSON(jsonString) {
    try {
      const obj = JSON.parse(jsonString);
      return this.stringify(obj, { pretty: true, columnar: true });
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }

  toJSON(jdonString, options = {}) {
    const { pretty = false, indent = 2 } = options;
    try {
      const obj = this.parse(jdonString);
      return pretty ? JSON.stringify(obj, null, indent) : JSON.stringify(obj);
    } catch (error) {
      throw new Error(`Invalid JDON: ${error.message}`);
    }
  }
}

// Export
const JDON = new JDONParser();
const fromJSON = (json) => JDON.fromJSON(json);
const toJSON = (jdon, options) => JDON.toJSON(jdon, options);

// ===== TESTS =====
console.log("=== Test 1: Columnar Array Format ===");
const employees = [
  {
    id: "emp_001",
    name: "Alice Johnson",
    email: "alice.j@company.com",
    department: "Engineering",
    salary: 95000,
    active: true,
  },
  {
    id: "emp_002",
    name: "Bob Smith",
    email: "bob.smith@company.com",
    department: "Marketing",
    salary: 72000,
    active: true,
  },
  {
    id: "emp_003",
    name: "Carol White",
    email: "carol.w@company.com",
    department: "Engineering",
    salary: 103000,
    active: true,
  },
  {
    id: "emp_004",
    name: "David Brown",
    email: "david.b@company.com",
    department: "Sales",
    salary: 68000,
    active: false,
  },
  {
    id: "emp_005",
    name: "Eve Davis",
    email: "eve.davis@company.com",
    department: "HR",
    salary: 81000,
    active: true,
  },
];

const employeesJSON = JSON.stringify(employees);
const employeesJDON = JDON.stringify(employees, {
  pretty: true,
  columnar: true,
});

console.log("Columnar JDON output:");
console.log(employeesJDON);

console.log("\n=== Token Comparison ===");
console.log(`JSON length: ${employeesJSON.length} characters`);
console.log(`JDON length: ${employeesJDON.length} characters`);
console.log(
  `Savings: ${((1 - employeesJDON.length / employeesJSON.length) * 100).toFixed(
    1
  )}%`
);
console.log(
  `Token estimate - JSON: ~${Math.ceil(employeesJSON.length / 4)} tokens`
);
console.log(
  `Token estimate - JDON: ~${Math.ceil(employeesJDON.length / 4)} tokens`
);
console.log(
  `Token savings: ~${
    Math.ceil(employeesJSON.length / 4) - Math.ceil(employeesJDON.length / 4)
  } tokens`
);

console.log("\n=== Round-trip Test ===");
const parsedBack = JDON.parse(employeesJDON);
console.log("Parsed back:", JSON.stringify(parsedBack, null, 2));
const roundTripMatch = JSON.stringify(employees) === JSON.stringify(parsedBack);
console.log("Round-trip successful:", roundTripMatch ? "✓" : "✗");

console.log("\n=== Test 2: Large Dataset (20 employees) ===");
const largeEmployees = [
  {
    id: "emp_001",
    name: "Alice Johnson",
    email: "alice.j@company.com",
    department: "Engineering",
    salary: 95000,
    active: true,
  },
  {
    id: "emp_002",
    name: "Bob Smith",
    email: "bob.smith@company.com",
    department: "Marketing",
    salary: 72000,
    active: true,
  },
  {
    id: "emp_003",
    name: "Carol White",
    email: "carol.w@company.com",
    department: "Engineering",
    salary: 103000,
    active: true,
  },
  {
    id: "emp_004",
    name: "David Brown",
    email: "david.b@company.com",
    department: "Sales",
    salary: 68000,
    active: false,
  },
  {
    id: "emp_005",
    name: "Eve Davis",
    email: "eve.davis@company.com",
    department: "HR",
    salary: 81000,
    active: true,
  },
  {
    id: "emp_006",
    name: "Frank Miller",
    email: "frank.m@company.com",
    department: "Engineering",
    salary: 98000,
    active: true,
  },
  {
    id: "emp_007",
    name: "Grace Lee",
    email: "grace.lee@company.com",
    department: "Marketing",
    salary: 76000,
    active: true,
  },
  {
    id: "emp_008",
    name: "Henry Wilson",
    email: "h.wilson@company.com",
    department: "Engineering",
    salary: 110000,
    active: true,
  },
  {
    id: "emp_009",
    name: "Iris Martinez",
    email: "iris.m@company.com",
    department: "Sales",
    salary: 71000,
    active: true,
  },
  {
    id: "emp_010",
    name: "Jack Taylor",
    email: "jack.t@company.com",
    department: "Engineering",
    salary: 92000,
    active: false,
  },
  {
    id: "emp_011",
    name: "Karen Anderson",
    email: "k.anderson@company.com",
    department: "HR",
    salary: 79000,
    active: true,
  },
  {
    id: "emp_012",
    name: "Leo Thomas",
    email: "leo.thomas@company.com",
    department: "Marketing",
    salary: 74000,
    active: true,
  },
  {
    id: "emp_013",
    name: "Mia Jackson",
    email: "mia.j@company.com",
    department: "Engineering",
    salary: 105000,
    active: true,
  },
  {
    id: "emp_014",
    name: "Noah Harris",
    email: "noah.h@company.com",
    department: "Sales",
    salary: 69000,
    active: true,
  },
  {
    id: "emp_015",
    name: "Olivia Clark",
    email: "olivia.c@company.com",
    department: "Engineering",
    salary: 97000,
    active: true,
  },
  {
    id: "emp_016",
    name: "Paul Lewis",
    email: "paul.lewis@company.com",
    department: "HR",
    salary: 83000,
    active: true,
  },
  {
    id: "emp_017",
    name: "Quinn Walker",
    email: "q.walker@company.com",
    department: "Marketing",
    salary: 77000,
    active: false,
  },
  {
    id: "emp_018",
    name: "Rachel Hall",
    email: "rachel.h@company.com",
    department: "Engineering",
    salary: 101000,
    active: true,
  },
  {
    id: "emp_019",
    name: "Sam Young",
    email: "sam.young@company.com",
    department: "Sales",
    salary: 73000,
    active: true,
  },
  {
    id: "emp_020",
    name: "Tina King",
    email: "tina.king@company.com",
    department: "Engineering",
    salary: 94000,
    active: true,
  },
];

const largeJSON = JSON.stringify(largeEmployees);
const largeJDON = JDON.stringify(largeEmployees, { columnar: true });

console.log("20 employees comparison:");
console.log(
  `JSON: ${largeJSON.length} chars (~${Math.ceil(largeJSON.length / 4)} tokens)`
);
console.log(
  `JDON: ${largeJDON.length} chars (~${Math.ceil(largeJDON.length / 4)} tokens)`
);
console.log(
  `Savings: ${((1 - largeJDON.length / largeJSON.length) * 100).toFixed(1)}% (${
    Math.ceil(largeJSON.length / 4) - Math.ceil(largeJDON.length / 4)
  } tokens saved)`
);

console.log("\n=== Test 3: Mixed Data ===");
const mixedData = {
  users: largeEmployees,
  metadata: {
    total: 20,
    updated: "2025-11-15T10:00:00Z",
  },
  tags: ["engineering", "hr", "sales"],
};

const mixedJSON = JSON.stringify(mixedData);
const mixedJDON = JDON.stringify(mixedData, { pretty: false, columnar: true });

console.log("Mixed data (arrays + objects):");
console.log(`JSON: ${mixedJSON.length} chars`);
console.log(`JDON: ${mixedJDON.length} chars`);
console.log(
  `Savings: ${((1 - mixedJDON.length / mixedJSON.length) * 100).toFixed(1)}%`
);

const example = [
  {
    id: 1,
    name: "Alice Johnson",
    age: 29,
    email: "alice.johnson@example.com",
    isActive: true,
    role: "developer",
    department: "engineering",
    joinDate: "2020-03-15",
    lastLogin: "2025-11-10T14:22:05Z",
    salary: 85000,
    projects: ["Project A", "Project B"],
    address: {
      street: "123 Maple Street",
      city: "New York",
      zip: "10001",
      country: "USA",
    },
    skills: ["JavaScript", "React", "Node.js", "Python"],
    performanceScore: 88.5,
    managerId: 101,
  },
  {
    id: 2,
    name: "Bob Smith",
    age: 35,
    email: "bob.smith@example.com",
    isActive: false,
    role: "designer",
    department: "product",
    joinDate: "2018-07-22",
    lastLogin: "2025-10-29T09:14:42Z",
    salary: 72000,
    projects: ["Project X", "Project Y", "Project Z"],
    address: {
      street: "456 Oak Avenue",
      city: "San Francisco",
      zip: "94102",
      country: "USA",
    },
    skills: ["Figma", "Sketch", "Illustrator"],
    performanceScore: 91.2,
    managerId: 102,
  },
  {
    id: 3,
    name: "Catherine Lee",
    age: 42,
    email: "catherine.lee@example.com",
    isActive: true,
    role: "project manager",
    department: "operations",
    joinDate: "2015-01-10",
    lastLogin: "2025-11-12T16:08:22Z",
    salary: 95000,
    projects: ["Project Alpha", "Project Beta"],
    address: {
      street: "789 Pine Road",
      city: "Chicago",
      zip: "60605",
      country: "USA",
    },
    skills: ["Agile", "Scrum", "Leadership", "Communication"],
    performanceScore: 94.7,
    managerId: 103,
  },
  {
    id: 4,
    name: "Daniel Martinez",
    age: 31,
    email: "daniel.martinez@example.com",
    isActive: true,
    role: "QA engineer",
    department: "quality assurance",
    joinDate: "2019-09-05",
    lastLogin: "2025-11-14T11:45:10Z",
    salary: 68000,
    projects: ["Project Gamma"],
    address: {
      street: "321 Cedar Blvd",
      city: "Austin",
      zip: "73301",
      country: "USA",
    },
    skills: ["Selenium", "Cypress", "Test Automation", "API Testing"],
    performanceScore: 89.3,
    managerId: 104,
  },
  {
    id: 5,
    name: "Emily Davis",
    age: 27,
    email: "emily.davis@example.com",
    isActive: false,
    role: "data analyst",
    department: "analytics",
    joinDate: "2021-05-18",
    lastLogin: "2025-10-25T13:55:47Z",
    salary: 77000,
    projects: ["Project Delta", "Project Epsilon"],
    address: {
      street: "654 Birch Lane",
      city: "Seattle",
      zip: "98101",
      country: "USA",
    },
    skills: ["SQL", "Python", "Tableau", "Excel", "Power BI"],
    performanceScore: 87.8,
    managerId: 105,
  },
];

const exampleJSON = JSON.stringify(example);
const exampleJDON = JDON.stringify(example, { pretty: true, columnar: true });

console.log("\n=== Test 4: Objects and Arrays ===");
console.log(`JSON: ${exampleJSON.length} chars`);
console.log(`JDON: ${exampleJDON.length} chars`);
console.log(
  `Savings: ${((1 - exampleJDON.length / exampleJSON.length) * 100).toFixed(
    1
  )}%`
);

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = { JDON, JDONParser, fromJSON, toJSON };
}
