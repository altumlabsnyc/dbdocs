# DBDocs Generation Script

This repository contains a script that automatically generates database documentation and uploads documentation to [dbdocs](https://dbdocs.io/team/Altum).

### Installation Instructions

1. Request the `.env` from Alex that contains the connection details to Supabase and DBDocs.
2. Install the following dependencies after navigating to the project directory:
   - Make sure you have node installed.
   - `npm i`
   - `brew install postgresql@15`
   - `sudo npm install -g dbdocs`
   - `sudo npm install -g @dbml/cli`

### Usage

You can now run the `index.js` script with `npm run start`. A `schema.sql` and a `schema.dbml` will be output to the project directory.
