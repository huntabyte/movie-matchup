'use strict';
import * as bootstrap from 'bootstrap';

const createAutoComplete = ({ root, renderOption, onOptionSelect, inputValue, fetchData }) => {
	root.innerHTML = `
    <label class="form-label mb-0"><b>Search</b></label>
    <input class="form-control" />
    <div class="dropdown">
      <div class="dropdown-menu">
        <div class="dropdown-content results"</div>
      </div>
    </div>
`;

	const input = root.querySelector('input');
	const dropdown = root.querySelector('.dropdown-menu');
	const resultsWrapper = root.querySelector('.results');

	const onInput = async event => {
		const items = await fetchData(event.target.value);

		if (!items.length) {
			dropdown.classList.remove('show');
			return;
		}

		resultsWrapper.innerHTML = '';
		dropdown.classList.add('show');
		for (let item of items) {
			const option = document.createElement('a');

			option.classList.add('dropdown-item');
			option.innerHTML = renderOption(item);
			option.addEventListener('click', () => {
				dropdown.classList.remove('show');
				input.value = inputValue(item);
				onOptionSelect(item);
			});

			resultsWrapper.appendChild(option);
		}
	};
	input.addEventListener('input', debounce(onInput, 750));

	document.addEventListener('click', event => {
		if (!root.contains(event.target)) {
			dropdown.classList.remove('show');
		}
	});
};
const debounce = (func, delay = 1000) => {
	let timeoutId;
	return (...args) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			func.apply(null, args);
		}, delay);
	};
};

const autoCompleteConfig = {
	renderOption(movie) {
		const imgSrc = movie.Poster === 'N/A' ? '' : movie.Poster;
		return `
      <img src="${imgSrc}" />
      ${movie.Title} (${movie.Year})
    `;
	},
	inputValue(movie) {
		return movie.Title;
	},
	async fetchData(searchTerm) {
		const response = await axios.get('http://www.omdbapi.com/', {
			params: {
				apikey: '87b954c',
				s: searchTerm,
			},
		});

		if (response.data.Error) {
			return [];
		}

		return response.data.Search;
	},
};

createAutoComplete({
	...autoCompleteConfig,
	root: document.querySelector('#left-autocomplete'),
	onOptionSelect(movie) {
		onMovieSelect(movie, document.querySelector('#left-summary'), 'left');
	},
});
createAutoComplete({
	...autoCompleteConfig,
	root: document.querySelector('#right-autocomplete'),
	onOptionSelect(movie) {
		onMovieSelect(movie, document.querySelector('#right-summary'), 'right');
	},
});

let leftMovie;
let rightMovie;
const onMovieSelect = async (movie, summaryElement, side) => {
	const response = await axios.get('http://www.omdbapi.com/', {
		params: {
			apikey: '87b954c',
			i: movie.imdbID,
		},
	});

	summaryElement.innerHTML = movieTemplate(response.data);

	if (side === 'left') {
		leftMovie = response.data;
	} else {
		rightMovie = response.data;
	}
	if (leftMovie && rightMovie) {
		runComparison();
		document.getElementById('left-summary').addEventListener('DOMSubtreeModified', runComparison());
		document.getElementById('right-summary').addEventListener('DOMSubtreeModified', runComparison());
	}
};

const runComparison = () => {
	const leftSideStats = document.querySelectorAll('#left-summary .alert');
	const rightSideStats = document.querySelectorAll('#right-summary .alert');

	leftSideStats.forEach((leftStat, index) => {
		const rightStat = rightSideStats[index];
		const leftSideValue = parseInt(leftStat.dataset.value);
		const rightSideValue = parseInt(rightStat.dataset.value);

		if (rightSideValue > leftSideValue) {
			leftStat.classList.remove('alert-success');
			leftStat.classList.remove('alert-danger');
			leftStat.classList.add('alert-danger');
			rightStat.classList.remove('alert-danger');
			rightStat.classList.add('alert-success');
		} else {
			rightStat.classList.remove('alert-success');
			rightStat.classList.remove('alert-danger');
			rightStat.classList.add('alert-danger');
			leftStat.classList.remove('alert-danger');
			leftStat.classList.add('alert-success');
		}
	});
};

const movieTemplate = movieDetail => {
	const dollars = parseInt(movieDetail.BoxOffice.replace(/\$/g, '').replace(/,/g, ''));
	const metascore = parseInt(movieDetail.Metascore);
	const imdbRating = parseFloat(movieDetail.imdbRating) * 10;
	console.log(imdbRating);
	const imdbVotes = parseInt(movieDetail.imdbVotes.replace(/,/g, ''));

	const awards = movieDetail.Awards.split(' ').reduce((prev, word) => {
		const value = parseInt(word);

		if (isNaN(value)) {
			return prev;
		} else {
			return prev + value;
		}
	}, 0);

	const imgSrc = movieDetail.Poster === 'N/A' ? '' : movieDetail.Poster;
	return `
    <div class="container py-3 mt-2">
      <div class="row g-0 mb-2">
        <div class="col-md-3">
          <img src="${imgSrc}" class="card-image" />
        </div>
        <div class="col-md-9">
          <h1 class="movie-title">${movieDetail.Title}</h1>
          <h5 class="movie-cat">${movieDetail.Genre}</h5>
          <p class="movie-plot">${movieDetail.Plot}</p>
        </div>
      </div>
    </div>
    <div data-value=${awards} class="alert alert-success mt-2">
      <p class="title mb-1">${movieDetail.Awards}</p>
      <p class="subtitle">Awards</p>
    </div>

    <div data-value=${dollars} class="alert alert-success">
      <p class="title mb-1">${movieDetail.BoxOffice}</p>
      <p class="subtitle">Box Office</p>
    </div>

    <div data-value=${metascore} class="alert alert-success">
      <p class="title mb-1">${movieDetail.Metascore}</p>
      <p class="subtitle">Metascore</p>
    </div>

    <div data-value=${imdbRating} class="alert alert-success">
      <p class="title mb-1">${movieDetail.imdbRating}</p>
      <p class="subtitle">IMDB Rating</p>
    </div>

    <div data-value=${imdbVotes} class="alert alert-success">
      <p class="title mb-1">${movieDetail.imdbVotes}</p>
      <p class="subtitle">IMDB Votes</p>
    </div>
  `;
};
