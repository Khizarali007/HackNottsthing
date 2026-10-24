import { useEffect, useRef, useState, useCallback } from 'react';

export function useCommitClassifier() {
  const workerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [categories, setCategories] = useState({}); // { [commitId]: category }

  useEffect(() => {
    // TODO 1: create the worker, store it in workerRef.current


     const worker  = new Worker(new URL('../workers/aiWorker.js',import.meta.url),
    {type: 'module'}
    );
    workerRef.current = worker;
    // TODO 2: set worker.onmessage, handle 'ready' / 'result' / 'error'
    workerRef.current.onmessage = (e) =>
    {
        const {type,payload} = e.data;

        if (type === 'ready')
        {
            setStatus('ready');
        }

        if (type==='result')
        {
            setCategories(prev => ({
                ...prev,[payload.id]:payload.category
            }));
        }

        if(type==='error')
        {
            setStatus('error');
            console.error("Worker error:" , payload);
        }
    };

    // TODO 3: post { type: 'init' }
    workerRef.current.postMessage({type:'init'});
    // TODO 4: return a cleanup function
    return () => {
        workerRef.current.terminate();
    };
  }, []);

  const classifyCommits = useCallback((commits) => {
    if(!workerRef.current) return;


    const slim = commits.map((c)=> ({
        id:c.id,
        message:c.message,
    }));
    workerRef.current.postMessage({type:'classify',payload:slim});
  }, []);

  return { classifyCommits, categories, status };
}