import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { FileExplorer } from './components/sidebar-left/FileExplorer';
import { EditorWorkspace } from './components/canvas/EditorWorkspace';
import { RightSidebar } from './components/sidebar-right/RightSideBar';

// Import global styles for Monaco Editor decorations
import './styles/warden.css';

/**
 * Root application entry point.
 * Composes the primary layout using completely decoupled UI containers.
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