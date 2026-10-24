import { useEffect } from 'react';
import { useCommitClassifier } from './hooks/useCommitClassifier';

const TEST_COMMITS = [
                    { id: '1', message: 'fix null pointer crash in login' },
                    { id: '2', message: 'add dark mode toggle to settings' },
                    { id: '3', message: 'extract auth logic into separate module' },
                    { id: '4', message: 'bump dependencies and update readme' },
                    { id: '5', message: 'wip' },
                    { id: '6', message: "Merge branch 'main' into feature/login" },
                    { id: '7', message: 'fix typo in readme' },
                    { id: '8', message: 'update' },
];

export default function TestClassifier() {
  const { classifyCommits, categories, status } = useCommitClassifier();

  useEffect(() => {
    // TODO: if status is 'ready', call classifyCommits(TEST_COMMITS)

    if(status ==='ready')
    {
        classifyCommits(TEST_COMMITS);
    }
  }, [status, classifyCommits]);

  return (
    <div>
      <p>status: {status}</p>
      <pre>{JSON.stringify(categories, null, 2)}</pre>
    </div>
  );
}