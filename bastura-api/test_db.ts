import postgres from 'postgres';
import fs from 'fs';

const sql = postgres(`postgres://ecocycle.bastura@gmail.com:Bastura_Ecocycle.ITK@127.0.0.1:5432/bastura`);

async function run() {
    try {
        const schema = fs.readFileSync('../bastura-db/init-scripts/01-schema.sql', 'utf8');
        await sql.unsafe(schema);
        console.log("01-schema executed successfully");
        
        const views = fs.readFileSync('../bastura-db/init-scripts/04-view.sql', 'utf8');
        await sql.unsafe(views);
        console.log("04-view executed successfully");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await sql.end();
    }
}
run();
