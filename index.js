import * as d3 from "d3";


// load and filter the dataset (option 2, see A1 for option 1)
const penguins = await d3.csv("data/penguins.csv", d3.autoType)
	.then(penguins => penguins.filter(penguin => d3.every(Object.values(penguin), value => value !== 'NA')))

console.log(penguins)

const svg = d3.select('#visualization');