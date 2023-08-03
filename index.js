require("dotenv").config();
const { exec } = require("child_process");
const fs = require("fs");

// db connection details
const user = process.env.DB_USER;
const host = process.env.DB_HOST;
const database = process.env.DB_DATABASE;
const password = process.env.DB_PASSWORD;
const port = process.env.DB_PORT;
const token = process.env.DBDOCS_TOKEN;

function filterCreatePolicy(array) {
  let startFlag = false;
  const filteredArray = array.filter((item) => {
    if (item.startsWith("CREATE POLICY")) {
      startFlag = true;
      return false;
    }
    if (item.endsWith("--")) {
      startFlag = false;
      return false;
    }
    return !startFlag;
  });

  return filteredArray;
}

// command to download the schema
let command = `PGPASSWORD=${password} pg_dump -U ${user} -h ${host} -p ${port} -d ${database} --schema=public -s --no-owner --no-privileges --no-comments`;

// run the pg_dump command
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.log(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.log(`Stderr: ${stderr}`);
    return;
  }

  const sql = stdout;

  // iterate through each line of dbmlFile and slice each line after the '::' if there is a '::' on that line
  let inFunction = false;

  const sqlLines = sql.split("\n");
  const sqlLinesWithoutFunctionsOrTriggers = sqlLines.reduce((lines, line) => {
    if (line.includes("CREATE FUNCTION public.")) {
      inFunction = true;
    }

    if (!inFunction && !line.includes("CREATE TRIGGER")) {
      // Your previous logic
      if (line.includes("::")) {
        const lineWithoutComments = line.slice(0, line.indexOf("::"));
        lines.push(lineWithoutComments + ",");
      } else {
        lines.push(line);
      }
    }

    if (line.includes("$$;")) {
      inFunction = false;
    }

    return lines;
  }, []);

  // const sqlLinesWithoutPolicies = sqlLinesWithoutFunctionsOrTriggers.filter(
  //   (line) => !line.includes("CREATE POLICY")
  // );

  const sqlLinesWithoutPolicies = filterCreatePolicy(
    sqlLinesWithoutFunctionsOrTriggers
  );

  const sqlContent = sqlLinesWithoutPolicies.join("\n");

  // write the output to a file
  fs.writeFile("schema.sql", sqlContent, (err) => {
    if (err) throw err;
    console.log("Schema has been saved!");

    // Only once the schema.sql file has been written we run the sql2dbml command
    command = `npx sql2dbml schema.sql --postgres`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`Stderr: ${stderr}`);
        return;
      }

      const dbmlFileContent = stdout;

      const projectData = `Project altum {\n\tdatabase_type: 'altum'\n}\n\n`;

      const dbmlFile = projectData + dbmlFileContent;

      // write the output to a file
      fs.writeFile("schema.dbml", dbmlFile, (err) => {
        if (err) throw err;
        console.log("DBML file has been created!");
      });

      // Only once the schema.dbml file has been written we run the dbdocs build command
      command = `DBDOCS_TOKEN=${token} npx dbdocs build schema.dbml`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.log(`Stderr: ${stderr}`);
          return;
        }
        console.log(stdout);
        console.log("DBDocs has been built!");
      });
    });
  });
});
