import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(__dirname,'.repo-cache')

const GITHUB_URL = /^https:\/\/github\.com\/([\w-]+)\/([\w.-]+?)(?:\.git)?\/?$/;


// refresh: false reuses a cached clone as it is instead of fetching again.
async function getRepoPath(url, { refresh = true } = {})
{

    const match = url.match(GITHUB_URL);
    if(!match)
    {
        const err = new Error('Only https://github.com/owner/repo URLs are supported.');
        err.status = 400;
        throw err;
    }
    const[,owner,repo] = match;

    if (/^\.+$/.test(repo)) {
        const err = new Error('Invalid repository name.');
        err.status = 400;
        throw err;
    }
    fs.mkdirSync(CACHE_DIR,{recursive: true});

    const folder = path.join(CACHE_DIR,`${owner}__${repo}`);
    const cleanURL = `https://github.com/${owner}/${repo}`;
    const opts = { env: {...process.env,GIT_TERMINAL_PROMPT:'0'},timeout:120000};

    try
    {


                if (fs.existsSync(folder))
                {
                    if (refresh) await run('git',['-C',folder,'fetch','origin','+refs/heads/*:refs/heads/*','--prune'],opts);
                }
                else{
                    await run('git',['clone','--bare',cleanURL,folder],opts)
                }
    }
    catch(cloneError)
    {
        const err = new Error("Couldn't clone that repo. Is it public?");
        err.status  = 400;
        console.error(cloneError.message)
        throw err;

    }  
    return folder; 
}


export { getRepoPath };
