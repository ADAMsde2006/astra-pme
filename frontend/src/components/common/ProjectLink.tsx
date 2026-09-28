import React from 'react';
import { Link } from 'react-router-dom';

interface ProjectLinkProps {
  projectCode: number | string;
  projectName?: string;
  className?: string;
  showName?: boolean;
}

export const ProjectLink: React.FC<ProjectLinkProps> = ({
  projectCode,
  projectName,
  className = '',
  showName = false
}) => {
  return (
    <Link
      to={`/projects/${projectCode}`}
      className={`inline-flex items-center gap-1.5 font-mono text-[#007acc] hover:text-[#38a3e5] hover:underline font-medium transition-colors ${className}`}
      title={projectName ? `View Project #${projectCode}: ${projectName}` : `View Project #${projectCode}`}
    >
      <span>#{projectCode}</span>
      {showName && projectName && (
        <span className="font-sans text-xs text-[#aaaaaa] truncate max-w-[280px]">
          - {projectName}
        </span>
      )}
    </Link>
  );
};
