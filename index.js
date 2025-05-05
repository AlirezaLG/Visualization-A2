import * as d3 from "d3";

const margin = { top: 40, right: 40, bottom: 60, left: 80 };
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// #region Load and filter data
const penguins = await d3
  .csv("data/penguins.csv", d3.autoType)
  .then((data) =>
    data.filter((d) =>
      d3.every(Object.values(d), (v) => v !== "NA" && v !== null)
    )
  );
// #endregion

// #region Heatmap: species vs island
function drawHeatmap(data) {
  const svg = d3.select("#heatmap");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const counts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d.island,
    (d) => d.species
  );
  const islands = Array.from(new Set(data.map((d) => d.island)));
  const species = Array.from(new Set(data.map((d) => d.species)));

  const heatmapData = [];
  islands.forEach((island) => {
    species.forEach((sp) => {
      heatmapData.push({
        island,
        species: sp,
        count: counts.get(island)?.get(sp) || 0,
      });
    });
  });

  const xScale = d3
    .scaleBand()
    .domain(species)
    .range([0, innerWidth])
    .padding(0.05);
  const yScale = d3
    .scaleBand()
    .domain(islands)
    .range([0, innerHeight])
    .padding(0.05);
  const colorScale = d3
    .scaleSequential(d3.interpolateBlues)
    .domain([0, d3.max(heatmapData, (d) => d.count)]);

  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale));

  g.append("g").call(d3.axisLeft(yScale));

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Species");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Island");

  g.selectAll("rect")
    .data(heatmapData)
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.species))
    .attr("y", (d) => yScale(d.island))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d.count))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`${d.count} ${d.species} on ${d.island}`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(500).style("opacity", 0);
    });
}
// #endregion

// #region Scatter plot: bill traits
function drawScatter(data) {
  const svg = d3.select("#scatter");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = data.filter((d) =>
    d3.every(
      [d.bill_length_mm, d.bill_depth_mm, d.body_mass_g, d.flipper_length_mm],
      (v) => v !== null && v !== "NA"
    )
  );

  const x = d3
    .scaleLinear()
    .domain(d3.extent(filtered, (d) => d.bill_length_mm))
    .range([0, innerWidth])
    .nice();

  const y = d3
    .scaleLinear()
    .domain(d3.extent(filtered, (d) => d.bill_depth_mm))
    .range([innerHeight, 0])
    .nice();

  const color = d3
    .scaleOrdinal()
    .domain(["Adelie", "Chinstrap", "Gentoo"])
    .range(["#1f77b4", "#2ca02c", "#ff7f0e"]);

  const widthScale = d3
    .scaleLinear()
    .domain(d3.extent(filtered, (d) => d.body_mass_g))
    .range([6, 20]); // triangle base width

  const heightScale = d3
    .scaleLinear()
    .domain(d3.extent(filtered, (d) => d.flipper_length_mm))
    .range([10, 30]); // triangle height

  function trianglePath(width, height) {
    const w = width / 2;
    return `M 0 ${-height / 2} L ${w} ${height / 2} L ${-w} ${height / 2} Z`;
  }

  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x));

  g.append("g").call(d3.axisLeft(y));

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Bill Length (mm)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Bill Depth (mm)");

  g.selectAll("path")
    .data(filtered)
    .enter()
    .append("path")
    .attr("d", (d) =>
      trianglePath(widthScale(d.body_mass_g), heightScale(d.flipper_length_mm))
    )
    .attr(
      "transform",
      (d) => `translate(${x(d.bill_length_mm)}, ${y(d.bill_depth_mm)})`
    )
    .attr("fill", (d) => color(d.species))
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `Species: ${d.species}<br>` +
            `Bill: ${d.bill_length_mm} × ${d.bill_depth_mm}<br>` +
            `Flipper: ${d.flipper_length_mm} mm<br>` +
            `Body Mass: ${d.body_mass_g} g`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(500).style("opacity", 0);
    });
}
// #endregion

// Draw both plots
drawHeatmap(penguins);
drawScatter(penguins);
