import React from 'react';
import ReactDOM from 'react-dom/client';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { FileExplorer } from './components/sidebar-left/FileExplorer';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WorkspaceLayout 
      leftSidebar={<FileExplorer />}
      centerCanvas={<section aria-label="Editor Canvas" />}
      bottomTerminal={<section aria-label="Terminal Output" />}
      rightSidebar={<aside aria-label="Warden Heuristic Analysis" />}
    />
  </React.StrictMode>
);