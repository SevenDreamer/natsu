pub mod schema;

use rusqlite::Connection;

pub type Database = Connection;

pub fn init_database() -> Result<Database, String> {
    let conn = Connection::open_in_memory().map_err(|e| e.to_string())?;
    schema::init(&conn)?;
    Ok(conn)
}
