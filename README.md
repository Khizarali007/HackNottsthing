# HackNottsthing
hacknotts project here
Overview + Prompts

Deliverable 1 — Executive overview
GitStory is a local developer tool that parses a Git repository and visualises its commit history as an interactive, explorable graph. To comply with HackNotts' strict rules against cloud-based LLM wrapper apps, GitStory relies entirely on local processing: a Node.js backend executing native git commands, a React Flow frontend for rendering, and Transformers.js running a local ML model in the browser to categorise commits.

The three-agent parallel strategy divides the work by strict architectural boundaries to avoid merge conflicts:

Agent 1 (Frontend & Graph UX): Owns the React Vite application, React Flow implementation, and overall user interface.


Agent 2 (Backend & Parsing): Owns the Node.js Express server, child_process execution, and raw Git output parsing.


Agent 3 (AI & Capability): Owns the local Transformers.js zero-shot classification pipeline and the commit details side-panel.


Deliverable 2 — Complete project brief
Product Name: GitStory Elevator Pitch: An interactive codebase visualizer that turns standard Git logs into an explorable node graph, sizing commits by impact and categorizing them using local AI.Target Audience: Developers onboarding to new projects or reviewing long pull requests.Main Pain Point: Reading terminal git log output or flat GitHub histories obscures the true architectural impact and intent of commits.Unique Selling Proposition (USP): Node size is bound to lines changed ("impact radius"), and commits are auto-categorised via in-browser machine learning without external APIs.Demo Objective: The judges should remember a slick, 60-second visual playback of a repository growing, with massive refactors appearing as giant nodes and bug fixes color-coded automatically.

Core User Journey
Action: User starts the local Node server in a target Git directory and opens the React app.


Frontend: Displays a loading state while fetching /api/history.


Backend: Executes git log, parses hashes, parents, metadata, and lines changed, returning a JSON array.


Frontend (AI): Passes commit messages to the Transformers.js WebWorker to classify them (e.g., Bug, Feature, Refactor) and updates the local state.


Frontend (Graph): Renders the React Flow graph. Nodes are sized by line changes and colored by AI classification.


Action: User clicks a specific node.


Frontend: Slides out a side-panel showing author, date, raw message, and AI category.


MVP Definition
P0 — Essential: Backend successfully parses git log into JSON. Frontend renders a basic React Flow graph connecting parents to children.


P1 — High Impact: Backend parses git log --stat to get linesAdded/linesDeleted. Frontend maps this to node size.


P2 — Optional: Transformers.js sentiment/category classification running locally in the browser to color-code nodes. A "Play" button to render nodes chronologically.


Non-goals: No authentication, no database (in-memory/local only), no cloud LLM APIs, no write operations (read-only visualization).

Deliverable 3 — Architecture and shared contracts
Code snippet
graph TD
    subgraph Frontend - Vite/React
        UI[React Flow UI - Agent 1]
        Panel[Side Panel - Agent 3]
        ML[Transformers.js WebWorker - Agent 3]
        
        UI -->|Selected Node| Panel
        ML -->|Enriches Data| UI
    end

    subgraph Backend - Node.js/Express
        API[Express Router - Agent 2]
        Parser[Git Log Parser - Agent 2]
        Git[(Local .git repo)]
        
        API --> Parser
        Parser --> Git
    end

    UI -->|GET /api/history| API


Shared Contracts: API & Data Models
All agents must strictly adhere to this exact JSON schema. The backend will serve it, the frontend will consume it, and the AI will append to it.

Endpoint: GET /api/historyPurpose: Fetches the full parsed commit history.Response Format (200 OK):

JSON
[
  {
    "id": "a1b2c3d",
    "parents": ["f9e8d7c"],
    "author": "Sreyas S",
    "date": "2026-10-24T12:00:00Z",
    "message": "Initial commit",
    "linesAdded": 50,
    "linesDeleted": 0,
    "aiCategory": null 
  }
]


(Note: aiCategory is initialized as null by the backend and populated asynchronously by the frontend Transformers.js worker).

Integration Rules
Port Conventions: Backend runs on :3001. Frontend runs on Vite default (:5173).


File Ownership:



Agent 1 owns client/src/components/Graph.jsx and App.jsx.


Agent 2 owns server/index.js and server/parser.js.


Agent 3 owns client/src/components/SidePanel.jsx and client/src/workers/aiWorker.js.


Deliverable 4 — Workstream ownership matrix
Feature
Owner
Dependencies
Acceptance Criteria
Node.js Server Setup
Agent 2
None
Runs on 3001, serves basic 200 OK health check.
Git Log Parsing
Agent 2
None
Executes git log natively, correctly handles merge commits (multiple parents), returns Shared Contract JSON.
React App Scaffolding
Agent 1
None
Vite app runs, React Flow canvas occupies full screen.
Graph Rendering
Agent 1
Agent 2 (or Mock)
JSON maps to nodes/edges. Parent-child arrows render correctly using dagre for layout.
Impact Radius (Sizing)
Agent 1
Agent 2
Node styling scales based on linesAdded + linesDeleted.
Local AI Classification
Agent 3
None
Transformers.js loads a lightweight zero-shot model (e.g., Xenova/mobilebert-uncased-mnli) and categorizes text.
Side Panel UI
Agent 3
Agent 1 (Click Event)
Clicking a node opens a polished side panel with commit metadata.

Deliverable 5 — Parallel execution plan
Phase 1: Shared Foundation (Hours 0-1)

Initialize repo, create server/ and client/ directories.


Agent 1 scaffolds Vite + React Flow and implements a hardcoded mockData.json using the Shared Contract.


Agent 2 initializes Express and writes the empty GET /api/history controller.


Phase 2: Parallel Implementation (Hours 1-5)

Agent 1: Builds the auto-layout logic (using dagre) so the Git graph flows top-to-bottom or left-to-right.


Agent 2: Writes the regex and child_process logic to parse git log --pretty=format:"%H|%P|%an|%ad|%s" --numstat.


Agent 3: Builds the WebWorker for Transformers.js to prevent UI freezing while the model loads, and builds the <SidePanel/> component.


Phase 3: Early Integration (Hours 5-7)

Agent 1 removes mockData.json and fetches from localhost:3001/api/history.


Agent 3 hooks the AI classifier into Agent 1's state, updating node colors dynamically as inferences complete.


Phase 4: Feature Completion & Polish (Hours 7-15)

Add the "Time-Lapse" playback slider (Agent 1).


Refine the regex for weird commit messages (Agent 2).


Polish CSS, empty states, and loading spinners (Agent 1 & 3).


Phase 5: Feature Freeze (Hour 16)

No new features. Only bug fixes, presentation prep, and testing on different repositories.


Deliverable 6 — Agent 1 prompt
Plaintext
You are the Lead Frontend Engineer (Agent 1) for a 24-hour hackathon project named "GitStory". 

PRODUCT OVERVIEW:
GitStory is a local developer tool that visualizes a Git repository's commit history as an interactive React Flow graph. The node sizes represent lines of code changed, and the node colors represent the commit intent (determined locally via AI by Agent 3). 
Target user: Developers onboarding to complex codebases.
Differentiator: Visualizing "impact radius" and chronological history visually.

YOUR ROLE & BOUNDARIES:
You own the Vite + React frontend, specifically the Graph UI.
You are responsible for:
1. Setting up React Flow and `dagre` for automated directed-graph layout.
2. Fetching data from the backend contract and mapping it to React Flow `nodes` and `edges`.
3. Scaling node dimensions based on `linesAdded` + `linesDeleted`.
4. Emitting an `onNodeClick` event that Agent 3 will use to open a side panel.

SHARED CONTRACT (API /api/history):
You must build against this exact JSON schema:
[
  {
    "id": "a1b2c3d",
    "parents": ["f9e8d7c"], // Array of strings. Note: can be empty (initial commit) or multiple (merge).
    "author": "Sreyas S",
    "date": "2026-10-24T12:00:00Z",
    "message": "Initial commit",
    "linesAdded": 50,
    "linesDeleted": 0,
    "aiCategory": null // Will be mutated later by Agent 3
  }
]

DEPENDENCIES & PARALLEL WORK:
- Agent 2 is building the Express backend. Until they finish, use a hardcoded `mockData.json` file containing the schema above.
- Agent 3 is building a `<SidePanel />` and a Transformers.js WebWorker. Leave a placeholder slot in your `App.jsx` layout for the SidePanel.

PRIORITISED TASKS:
1. Scaffold the basic React Flow canvas.
2. Write a mapping function: `id` becomes node ID. `parents` array maps to edge sources/targets.
3. Integrate `dagre` to auto-position the nodes so it looks like a Git tree (handling branches).
4. Create a custom Node component that scales in size based on the lines changed.

ACCEPTANCE CRITERIA:
- The graph renders without overlapping nodes.
- Multiple branches and merge commits render correctly.
- The UI handles up to 500 nodes smoothly.

CONSTRAINTS:
- Do not build the backend logic.
- Prioritize a working, polished demo over minor optimizations.
- Format your response as a status report: [Completed], [Files Changed], [Next Actions], [Blockers]. Provide complete, usable React components.


Deliverable 7 — Agent 2 prompt
Plaintext
You are the Lead Backend Engineer (Agent 2) for a 24-hour hackathon project named "GitStory".

PRODUCT OVERVIEW:
GitStory is a local developer tool that visualizes a Git repository's commit history. 
Target user: Developers onboarding to complex codebases.
Differentiator: Replaces reading terminal output with a visual timeline.

YOUR ROLE & BOUNDARIES:
You own the Node.js Express server. 
You are responsible for:
1. Setting up a local Express server on port 3001.
2. Executing native Git commands against a local directory using `child_process.exec`.
3. Parsing the raw stdout text into a clean JSON array.
4. Exposing this via `GET /api/history`.

SHARED CONTRACT (API /api/history):
You must output this exact JSON schema:
[
  {
    "id": "a1b2c3d",
    "parents": ["f9e8d7c"], // Array of strings. Empty for initial commit. Multiple for merges.
    "author": "Sreyas S",
    "date": "2026-10-24T12:00:00Z",
    "message": "Initial commit",
    "linesAdded": 50,
    "linesDeleted": 0,
    "aiCategory": null // Always return null. Agent 3 will populate this on the frontend.
  }
]

DEPENDENCIES & PARALLEL WORK:
- Agent 1 is building the frontend based on this contract. You must not change the JSON schema without full team agreement. 

PRIORITISED TASKS:
1. Initialize Express and CORS.
2. Write a Git service that runs `git log --pretty=format:"%H|%P|%an|%ad|%s"`.
3. Write parsing logic to split the output by newlines and pipes (`|`). Handle merge commits (where `%P` returns multiple hashes separated by spaces).
4. (Crucial) Execute a secondary command or modify the first to include `--numstat` or `--shortstat` to reliably calculate `linesAdded` and `linesDeleted` for each commit.
5. Merge the metadata and the stat data into the final JSON array.

ACCEPTANCE CRITERIA:
- The API returns 200 OK with valid JSON.
- It does not crash if a commit message contains pipes, quotes, or weird characters.
- It accurately counts lines added and deleted.

CONSTRAINTS:
- Do not build UI. Do not use external cloud APIs (Hackathon rules).
- Keep regex and string parsing as robust as possible.
- Format your response as a status report: [Completed], [Files Changed], [Next Actions], [Blockers]. Provide the complete Node.js controllers and parsing functions.


Deliverable 8 — Agent 3 prompt
Plaintext
You are the AI & Integration Specialist (Agent 3) for a 24-hour hackathon project named "GitStory".

PRODUCT OVERVIEW:
GitStory is a codebase visualizer. To win the "Best Use of AI" prize without violating the hackathon's ban on cloud LLM wrappers, we are running machine learning locally in the browser.
Target user: Developers onboarding to complex codebases.
Differentiator: Zero-shot classification of commit messages running entirely client-side.

YOUR ROLE & BOUNDARIES:
You own the local ML pipeline and the commit details Side Panel in the React application.
You are responsible for:
1. Implementing `Transformers.js` via a WebWorker (to prevent blocking the main UI thread).
2. Creating a classification pipeline that reads a commit message and tags it as "Bugfix", "Feature", "Refactor", or "Chore".
3. Building a `<SidePanel />` React component that slides in to display commit details when a node is clicked.

SHARED CONTRACT (API /api/history):
Agent 1 and Agent 2 use this schema. Your AI pipeline will mutate the `aiCategory` field on the client side.
{
  "id": "a1b2c3d",
  "parents": ["f9e8d7c"],
  "author": "Sreyas S",
  "date": "2026-10-24T12:00:00Z",
  "message": "Initial commit",
  "linesAdded": 50,
  "linesDeleted": 0,
  "aiCategory": null // Your WebWorker must populate this.
}

DEPENDENCIES & PARALLEL WORK:
- Agent 1 owns the React Flow canvas. You must expose a `classifyCommits(nodes)` function or hook that Agent 1 can call to enrich their state.
- Agent 1 will pass you a `selectedNode` object to render in your `<SidePanel />`.

PRIORITISED TASKS:
1. Write `aiWorker.js` using `@xenova/transformers`. Load a lightweight zero-shot classification model (e.g., `Xenova/mobilebert-uncased-mnli`).
2. Create a React hook `useCommitClassifier` that manages the WebWorker lifecycle, sends commit messages to the worker, and returns the categorized results.
3. Build the `<SidePanel />` UI using Tailwind/CSS to beautifully display the commit data and the resulting AI category badge.

ACCEPTANCE CRITERIA:
- The UI does not freeze while the model downloads or infers.
- Commits are accurately classified based on their message.
- The Side Panel looks polished and handles null/empty states gracefully.

CONSTRAINTS:
- Do NOT use OpenAI, Claude, or any external API. All ML must be client-side via Transformers.js.
- Format your response as a status report: [Completed], [Files Changed], [Next Actions], [Blockers]. Provide the WebWorker code, the hook, and the SidePanel component.


Deliverable 9 — Master timeline
Saturday

12:00 - 13:00: Kickoff. Initialize repo. Paste Prompts 1, 2, and 3 into respective agents.


13:00 - 16:00: Parallel Implementation. Agent 1 builds Mock UI. Agent 2 builds parser. Agent 3 builds WebWorker.


16:00 - 17:00: Integration Gate 1. Connect Frontend to real Backend. Drop the mock data. Ensure basic graph renders from real Git repo. If blocked, fall back to flat history without dagre branching.


17:00 - 20:00: Feature addition. Impact radius sizing (Agent 1) and Transformers.js hookup (Agent 3).


20:00 - 21:00: Dinner / Break.


21:00 - 00:00: UI Polish. Side panel styling. Animation setup.


Sunday

00:00 - 01:00: Integration Gate 2. End-to-End test on a large repository (e.g., React or Vue). Fix critical performance bugs.


01:00 - 07:00: Rest / Sleep. Crucial for presentation coherence.


07:00 - 09:00: Feature Freeze. Fix remaining bugs. No new logic. Add empty states and loading spinners.


09:00 - 10:30: Prepare Demo Repository. (Create a dedicated local Git repo with highly specific, narrative commits designed to show off the graph sizes and AI classifications perfectly).


10:30 - 11:30: Presentation Rehearsal. Script the 60 seconds exactly.


11:30 - 12:00: Buffer & Submission.


Deliverable 10 — Testing and launch checklist
[ ] Startup Test: Running npm start in server and npm run dev in client works seamlessly without environment variable crashes.


[ ] Data Validation: Running the tool on a repo with complex merge commits does not break the parser or crash the graph layout.


[ ] Performance Check: Testing on a repository with 500+ commits renders in under 3 seconds.


[ ] AI Fallback: If the browser cannot download the Transformers.js model (due to strict local WiFi), the app gracefully ignores the aiCategory and renders the graph anyway without crashing.


[ ] Golden Path Rehearsal: User opens app -> Graph auto-draws -> AI badges pop in asynchronously -> User clicks giant node -> Side panel opens showing "Refactor".


[ ] Submission Check: README is populated with screenshots, setup instructions, and architecture explanation.


Deliverable 11 — Risk register
Risk
Probability
Impact
Prevention / Fallback
Owner
Git string parsing fails on weird commit messages (e.g., quotes, pipes inside messages).
High
High
Prevention: Use an obscure delimiter in --pretty=format (e.g., ^%^). Fallback: Skip malformed commits in the map function.
Agent 2
Transformers.js model too large causing massive load times on hackathon WiFi.
Medium
High
Prevention: Explicitly use a quantized, lightweight model (e.g., Xenova/distilbert-base-uncased). Fallback: Disable AI feature; rely solely on impact radius for USP.
Agent 3
React Flow / Dagre layout overlaps creating a messy, unreadable web.
Medium
Medium
Prevention: Stick strictly to left-to-right (LR) dagre layout. Fallback: Abandon auto-layout and render a simple vertical timeline.
Agent 1

Deliverable 12 — Operating instructions
Setup & Execution:

Create the Repository: Create a single Git repository on your machine. Add a client/ folder and server/ folder.


Launch the Agents:



Open Claude Pro (Web). Paste Agent 2 Prompt. (Claude is best at complex string parsing and algorithms).


Open Claude Code (CLI) or a second Claude tab. Paste Agent 1 Prompt. (Best for React UI).


Open Gemini. Paste Agent 3 Prompt. (Excellent at researching esoteric libraries like Transformers.js).


The Feedback Loop:



Do not let the agents talk endlessly. Ask for the code, copy it to your editor, run it, and immediately feed the exact terminal output or browser error back to the specific agent.


Integration Rule:



When an agent finishes a component, do not ask them how to integrate it with the other agent's code. You are the architect. Take Agent 2's API URL and manually pass it to Agent 1's fetch function. Take Agent 3's useCommitClassifier hook and manually import it into Agent 1's App.jsx.


Conflict Resolution:



If Agent 1 says "I need the backend to send data in a nested object," tell Agent 1: "No, the Shared Contract is fixed as a flat array. Adjust your frontend to match." Maintain absolute discipline over the JSON schema.

