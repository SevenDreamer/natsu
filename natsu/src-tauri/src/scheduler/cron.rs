use chrono::{DateTime, Utc};
use cron::Schedule;
use std::str::FromStr;

/// Cron expression presets for UI
pub const CRON_PRESETS: &[(&str, &str)] = &[
    ("每小时整点", "0 * * * *"),
    ("每天 9:00", "0 9 * * *"),
    ("工作日 9:00", "0 9 * * 1-5"),
    ("每周一 9:00", "0 9 * * 1"),
    ("每天午夜", "0 0 * * *"),
];

/// Parse a cron expression into a Schedule
pub fn parse_cron_expression(expression: &str) -> Result<Schedule, String> {
    Schedule::from_str(expression)
        .map_err(|e| format!("Invalid cron expression '{}': {}", expression, e))
}

/// Get the next run time from a schedule
pub fn get_next_run_time(schedule: &Schedule) -> Option<DateTime<Utc>> {
    schedule.after(&Utc::now()).next()
}

/// Get the next N run times from a schedule
pub fn get_next_n_run_times(schedule: &Schedule, n: usize) -> Vec<DateTime<Utc>> {
    schedule
        .after(&Utc::now())
        .take(n)
        .collect()
}

/// Validate a cron expression and return preview of next run times
pub fn validate_cron_expression(expression: &str) -> Result<Vec<String>, String> {
    let schedule = parse_cron_expression(expression)?;
    let next_times = get_next_n_run_times(&schedule, 3);

    Ok(next_times
        .iter()
        .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
        .collect())
}

/// Calculate next run timestamp from cron expression
pub fn calculate_next_run_timestamp(expression: &str) -> Result<i64, String> {
    let schedule = parse_cron_expression(expression)?;
    let next = get_next_run_time(&schedule)
        .ok_or_else(|| "No future run time found".to_string())?;
    Ok(next.timestamp())
}
