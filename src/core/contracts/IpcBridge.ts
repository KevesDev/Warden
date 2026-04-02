import { FileNode } from './FileTree';
import { WardenAnalysisResult } from './WardenSchema';

/**
 * Predefined command strings used to invoke Tauri Rust functions from React.
 */
export enum IpcCommand {
    ReadDirectory = 'read_directory',
    ReadFile = 'read_file',
    WriteFile = 'write_file',
    AnalyzeCode = 'analyze_code',
    AnalyzePastedChunk = 'analyze_pasted_chunk'
}

export interface ReadDirectoryPayload {
    directory_path: string;
}

export interface ReadDirectoryResponse {
    root_node: FileNode;
}

export interface ReadFilePayload {
    file_path: string;
}

export interface ReadFileResponse {
    file_content: string;
}

export interface WriteFilePayload {
    file_path: string;
    file_content: string;
}

export interface WriteFileResponse {
    success: boolean;
    error_message?: string;
}

export interface AnalyzeCodePayload {
    file_path: string;
    file_content: string;
}

export interface AnalyzePastedChunkPayload {
    file_path: string;
    pasted_content: string;
    line_start: number;
    line_end: number;
}