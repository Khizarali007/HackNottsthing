import { pipeline } from '@huggingface/transformers';
let classifier = null;
const classLabels = ['bug fix','new feature','code refactoring','chore']

async function getClassifier()
{
    if (classifier ===null )
    {
        classifier = await pipeline('zero-shot-classification','Xenova/mobilebert-uncased-mnli');

    }

    return classifier;
}

self.onmessage = async (event) => {
    const {type,payload} = event.data;

    try
    {
        if (type === 'init')
        {
            await getClassifier();
            self.postMessage({type: 'ready'});
        }

        else if(type ==='classify')
        {

            const classifier = await getClassifier();

            for( const commit of payload)
            {
                if(commit.message.toLowerCase().startsWith('merge'))
                {
                    self.postMessage({
                        type:'result',
                        payload: { id:commit.id,category: 'chore'}
                    });
                    continue;
                }

                if (commit.message.trim().split(/\s+/).length < 2) 
                    {self.postMessage({ type: 'result', payload: { id: commit.id, category: null } });
                continue;
                }
                if(commit.message.toLowerCase().includes('readme'))
                {
                    self.postMessage({
                        type:'result',
                        payload: { id:commit.id,category: 'chore'}
                    });
                    continue;
                }
                const result = await classifier(commit.message,classLabels);

                console.log(`#${commit.id} "${commit.message}" → ${result.labels[0]} (${result.scores[0].toFixed(2)})`);        
                
                const threshold = 0.4;
                const finalCategory = result.scores[0] >= threshold ? result.labels[0] :null;

                self.postMessage({type:'result',payload:{id:commit.id,category:finalCategory}});

            }

        }
    }
    catch(err)
    {
        self.postMessage({type:'error',payload: err.message});
    }



}
