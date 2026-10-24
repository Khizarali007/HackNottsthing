import { useEffect, useState } from 'react';

const TICK_MS = 120; // tune later: 500 commits in ~60s is about 120ms

export default function TimeLapseSlider({ total, value, onChange }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // TODO 1: if (!playing) return;
    if(!playing) return;
    // TODO 2: if value >= total, setPlaying(false) and return
    if(value>= total)
    {
        setPlaying(false);
        return;
    }
    // TODO 3: const id = setTimeout(() => onChange(value + 1), TICK_MS);
    const id = setTimeout(() => onChange(value+1),TICK_MS);
    // TODO 4: return () => clearTimeout(id);
    return () => clearTimeout(id);
  }, [playing, value, total, onChange]);

  // TODO 5: handlePlayClick: if value >= total, onChange(0) first, then setPlaying(true)
  const handlePlayClick = () => 
    {
        if(playing) setPlaying(false);
        else
        {
            if(value>=total)
            {
                onChange(0);
            }
            setPlaying(true);
        }
    }

  // TODO 6: return JSX: a button, a range input, and a "value / total" label
  return(
    <div className='timeLapse-control'>
        <button onClick={handlePlayClick}>
            {playing ? 'Pause' : 'Play'}
        </button>

        <input
            type = "range"
            min = {0}
            max = {total}
            value = {value}
            onChange={(e) => onChange(Number(e.target.value))}
        />

        <span>{value} / {total}</span>

    </div>



  )
}