const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const port = 8080;

app.use(cors());

function parseGitLog(rawOutput) {
    const trimmed = rawOutput.trim();
    if (!trimmed) return [];

    const blocks = trimmed.split(/\n(?=[0-9a-f]{40}\x1f)/);

    return blocks
        .map((block) => {
            const lines = block.split('\n');
            const header = lines[0];
            const statLines = lines.slice(1);
            const parts = header.split('\x1f');

            if (parts.length < 5) return null;

            const [id, parents, author, date, ...messageParts] = parts;
            const message = messageParts.join('\x1f');

            let linesAdded = 0;
            let linesDeleted = 0;

            for (const line of statLines) {
                if (!line.trim()) continue;

                const match = line.match(/^(\d+|-)\s+(\d+|-)\s+/);
                if (!match) continue;

                const added = match[1] === '-' ? 0 : Number(match[1]);
                const deleted = match[2] === '-' ? 0 : Number(match[2]);

                linesAdded += added;
                linesDeleted += deleted;
            }

            return {
                id,
                parents: parents ? parents.split(/\s+/).filter(Boolean) : [],
                author,
                date,
                message,
                linesadded: linesAdded,
                linesdeleted: linesDeleted,
                aiCategory: null,
            };
        })
        .filter(Boolean);
}

app.get('/api/history', (req, res) => {
    const child = spawn(
        'git',
        ['log', '--pretty=format:%H%x1f%P%x1f%an%x1f%ad%x1f%s', '--numstat', '--no-renames'],
        { cwd: process.cwd() }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    child.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({
                error: 'Failed to read git history',
                details: stderr.trim() || 'Unknown git error',
            });
        }

        const history = parseGitLog(stdout);
        res.json(history);
    });
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
