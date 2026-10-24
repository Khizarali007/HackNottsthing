import { useState } from 'react';
import TimeLapseSlider from './components/TimeLapseSlider';

export default function TestSlider() {
  const [visibleCount, setVisibleCount] = useState(0);
  return (
    <div>
      <TimeLapseSlider total={50} value={visibleCount} onChange={setVisibleCount} />
      <p>visibleCount: {visibleCount}</p>
    </div>
  );
}