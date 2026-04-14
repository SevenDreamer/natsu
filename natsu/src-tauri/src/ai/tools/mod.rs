//! AI Tools Module
//!
//! This module contains tool implementations for AI function calling.

pub mod execute_command;
pub mod query_knowledge_base;

pub use execute_command::{
    ExecuteCommandTool, ExecuteCommandInput, CommandSafety, SafetyInfo,
    CommandResult, ToolConfirmationRequest, check_command_safety,
};

pub use query_knowledge_base::{KnowledgeSearchResult, QueryKnowledgeBaseTool};
