import React, { useContext } from 'react';
import { ThemeContext } from './ThemeContext';

const FontSizeToggle: React.FC = () => {
  const { fontSize, increaseFontSize } = useContext(ThemeContext);

  const getFontSizeLabel = () => {
    switch (fontSize) {
      case 'normal':
        return 'A';
      case 'large':
        return 'A+';
      case 'larger':
        return 'A++';
      default:
        return 'A';
    }
  };

  const getAriaLabel = () => {
    switch (fontSize) {
      case 'normal':
        return 'Increase font size to large';
      case 'large':
        return 'Increase font size to larger';
      case 'larger':
        return 'Reset font size to normal';
      default:
        return 'Change font size';
    }
  };

  return (
    <button
      onClick={increaseFontSize}
      className="grid h-10 w-10 place-items-center rounded-control border border-hairline bg-surface font-display font-semibold text-ink-secondary transition-colors duration-200 hover:border-stellar-400/40 hover:text-stellar-300"
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
    >
      <span className={`leading-none ${fontSize === 'normal' ? 'text-sm' : fontSize === 'large' ? 'text-base' : 'text-lg'}`}>
        {getFontSizeLabel()}
      </span>
    </button>
  );
};

export default FontSizeToggle;
