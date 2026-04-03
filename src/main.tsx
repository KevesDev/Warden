import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { FileExplorer } from './components/sidebar-left/FileExplorer';
import { EditorWorkspace } from './components/canvas/EditorWorkspace';
import { RightSideBar } from './components/sidebar-right/RightSideBar';
import { WardenTerminal } from './components/terminal/WardenTerminal';

// Import global styles for Monaco Editor and Warden UI decorations
import './styles/warden.css';

/**
 * Root application entry point for Warden IDE.
 * Orchestrates the primary layout components and mounts the live Terminal and Heuristic Tools.
 */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WorkspaceLayout 
        leftSidebar={<FileExplorer />}
        centerCanvas={<EditorWorkspace />}
        bottomTerminal={<WardenTerminal />} 
        rightSidebar={<RightSideBar />} 
      />
    </ErrorBoundary>
  </React.StrictMode>
);