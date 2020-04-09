import { extractPackageFile } from './extract';

export { extractPackageFile };

export const autoReplace = true;

export const defaultConfig = {
  fileMatch: ['buildkite\\.ya?ml', '\\.buildkite/.+\\.ya?ml$'],
  commitMessageTopic: 'buildkite plugin {{depName}}',
  commitMessageExtra:
    'to {{#if isMajor}}v{{{newMajor}}}{{else}}{{{newValue}}}{{/if}}',
  managerBranchPrefix: 'buildkite-',
};
