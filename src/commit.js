// Mostly stolen from: https://dev.to/lucis/how-to-push-files-programatically-to-a-repository-using-octokit-with-typescript-1nj0

const fs = require('fs');
const path = require('path');

const uploadToRepo = async (octo, filesPaths, org, repo, branch) => {
  // gets commit's AND its tree's SHA
  const currentCommit = await getCurrentCommit(octo, org, repo, branch);
  const filesBlobs = await Promise.all(
    filesPaths.map(createBlobForFile(octo, org, repo))
  );
  // Stores files as <repo>/branch/name/filename.
  // E.g. getsentry repo branch feat/add-stuff will store files as getsentry/feat/add-stuff/pytest-coverage.txt
  const pathsForBlobs = filesPaths.map((fullPath) =>
    path.join(repo, branch, path.basename(fullPath))
  );
  const newTree = await createNewTree(
    octo,
    org,
    repo,
    filesBlobs,
    pathsForBlobs,
    currentCommit.treeSha
  );
  const commitMessage = `My commit message`;
  const newCommit = await createNewCommit(
    octo,
    org,
    repo,
    commitMessage,
    newTree.sha,
    currentCommit.commitSha
  );
  await setBranchToCommit(octo, org, repo, branch, newCommit.sha);
};

const getCurrentCommit = async (octo, org, repo, branch) => {
  const { data: refData } = await octo.git.getRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
  });
  const commitSha = refData.object.sha;
  const { data: commitData } = await octo.git.getCommit({
    owner: org,
    repo,
    commit_sha: commitSha,
  });
  return {
    commitSha,
    treeSha: commitData.tree.sha,
  };
};

// Notice that readFile's utf8 is typed differently from Github's utf-8
const getFileAsUTF8 = (filePath) => fs.readFileSync(filePath, 'utf8');

const createBlobForFile = (octo, org, repo) => async (filePath) => {
  const content = getFileAsUTF8(filePath);
  const blobData = await octo.git.createBlob({
    owner: org,
    repo,
    content,
    encoding: 'utf-8',
  });
  return blobData.data;
};

const createNewTree = async (
  octo,
  owner,
  repo,
  blobs, // : Octokit.GitCreateBlobResponse[]
  paths, //: string[],
  parentTreeSha
) => {
  // My custom config. Could be taken as parameters
  const tree = blobs.map(({ sha }, index) => ({
    path: paths[index],
    mode: `100644`,
    type: `blob`,
    sha,
  })); // as Octokit.GitCreateTreeParamsTree[]
  const { data } = await octo.git.createTree({
    owner,
    repo,
    tree,
    base_tree: parentTreeSha,
  });
  return data;
};

const createNewCommit = async (
  octo,
  org,
  repo,
  message,
  currentTreeSha,
  currentCommitSha
) =>
  (
    await octo.git.createCommit({
      owner: org,
      repo,
      message,
      tree: currentTreeSha,
      parents: [currentCommitSha],
    })
  ).data;

const setBranchToCommit = (octo, org, repo, branch, commitSha) =>
  octo.git.updateRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
    sha: commitSha,
  });

module.exports = { uploadToRepo };
