import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { FileExplorer } from './components/sidebar-left/FileExplorer';
import { EditorWorkspace } from './components/canvas/EditorWorkspace';
import { RightSidebar } from './components/sidebar-right/RightSideBar';

/**
 * Root application entry point.
 * Composes the primary layout using completely decoupled UI containers.
 * The rightSidebar prop now correctly mounts the finalized split-view tools.
 */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WorkspaceLayout 
        leftSidebar={<FileExplorer />}
        centerCanvas={<EditorWorkspace />}
        bottomTerminal={<section aria-label="Terminal Output" />} 
        rightSidebar={<RightSidebar />} 
      />
    </ErrorBoundary>
  </React.StrictMode>
);