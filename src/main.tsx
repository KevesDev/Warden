import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { FileExplorer } from './components/sidebar-left/FileExplorer';
import { EditorWorkspace } from './components/canvas/EditorWorkspace';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WorkspaceLayout 
        leftSidebar={<FileExplorer />}
        centerCanvas={<EditorWorkspace />}
        bottomTerminal={<section aria-label="Terminal Output" />}
        rightSidebar={<aside aria-label="Warden Heuristic Analysis" />}
      />
    </ErrorBoundary>
  </React.StrictMode>
);