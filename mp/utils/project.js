const PUBLIC_PROJECT_STATUSES = ['online', 'coming', 'full'];

function isPublicProject(project) {
  return Boolean(
    project &&
    PUBLIC_PROJECT_STATUSES.includes(project.status)
  );
}

module.exports = {
  PUBLIC_PROJECT_STATUSES,
  isPublicProject
};
