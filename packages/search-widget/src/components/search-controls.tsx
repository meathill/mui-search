/** @jsxImportSource preact */
import type { JSX } from "preact";

interface SearchControlsProps {
  query: string;
  placeholder: string;
  isSearching: boolean;
  clearQueryAriaLabel: string;
  searchButtonAriaLabel: string;
  queryInputRef: {
    current: HTMLInputElement | null;
  };
  onSearchSubmit(): void;
  onQueryInput(nextValue: string): void;
  onClearQuery(): void;
}

export function SearchControls(props: SearchControlsProps): JSX.Element {
  return (
    <form
      className="asw-controls"
      onSubmit={function onSubmit(event) {
        event.preventDefault();
        props.onSearchSubmit();
      }}
    >
      <div className="asw-input-wrap">
        <input
          ref={props.queryInputRef}
          className="asw-input"
          type="text"
          value={props.query}
          placeholder={props.placeholder}
          onInput={function onInputQuery(event) {
            const nextValue = (event.currentTarget as HTMLInputElement).value;
            props.onQueryInput(nextValue);
          }}
        />

        {props.query.length > 0 && (
          <button
            className="asw-input-clear-btn"
            type="button"
            aria-label={props.clearQueryAriaLabel}
            onClick={function onClickClearQuery() {
              props.onClearQuery();
            }}
          >
            <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M6.3 5 5 6.3 10.7 12 5 17.7 6.3 19l5.7-5.7 5.7 5.7 1.3-1.3-5.7-5.7L19 6.3 17.7 5 12 10.7z" />
            </svg>
          </button>
        )}
      </div>

      <button
        className="asw-button asw-search-icon-btn"
        type="submit"
        disabled={props.isSearching}
        aria-label={props.searchButtonAriaLabel}
      >
        {props.isSearching ? (
          <svg
            aria-hidden="true"
            focusable="false"
            className="asw-spinner"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 50 50"
          >
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="currentColor"
              stroke-width="5"
              stroke-dasharray="31.4 31.4"
              stroke-linecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 25 25"
                to="360 25 25"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        ) : (
          <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
            <path
              fill-rule="nonzero"
              d="M125 111 96 80q7-12 7-27c1-24-15-45-38-51S17 6 6 27C-5 49-1 75 17 91s44 18 64 4l29 30q8 6 15 0 6-8 0-14M52 88c-20 0-35-16-35-36 0-19 15-35 35-35a35 35 0 0 1 0 71"
            />
          </svg>
        )}
      </button>
    </form>
  );
}
