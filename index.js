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
    .scaleQuantize()
    .domain([0, d3.max(heatmapData, (d) => d.count)])
    .range(d3.schemeBlues[6]);

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

// #region Scatter plot matrix
function drawScatterMatrix(data) {
  const svg = d3.select("#scatter-matrix").style("cursor", "default");
  // clear previous
  svg.selectAll("*").remove();
  svg.on("dblclick", null);

  const width = +svg.attr("width"),
    height = +svg.attr("height"),
    innerW = width - margin.left - margin.right,
    innerH = height - margin.top - margin.bottom;

  const vars = [
    "bill_length_mm",
    "bill_depth_mm",
    "flipper_length_mm",
    "body_mass_g",
  ];
  const n = vars.length;
  const cellSize = Math.min(innerW, innerH) / n;
  const padding = 10;

  // ── Encodings ────────────────────────────────────
  const color = d3
    .scaleOrdinal()
    .domain(["Adelie", "Chinstrap", "Gentoo"])
    .range(["#1f77b4", "#2ca02c", "#ff7f0e"]);
  const tiltMap = { Dream: 0, Biscoe: 45, Torgersen: -45 };
  const triPath = () => {
    const w = 8,
      h = 8;
    return `M0 ${-h / 2} L${w / 2} ${h / 2} L${-w / 2} ${h / 2} Z`;
  };
  function islandAngle(i) {
    return tiltMap[i] || 0;
  }

  // precompute scales for each variable
  const xScales = {},
    yScales = {};
  vars.forEach((v) => {
    const ext = d3.extent(data, (d) => d[v]);
    xScales[v] = d3
      .scaleLinear()
      .domain(ext)
      .range([padding, cellSize - padding])
      .nice();
    yScales[v] = d3
      .scaleLinear()
      .domain(ext)
      .range([cellSize - padding, padding])
      .nice();
  });

  // ── REDUCING: species legend ───────────────────────────
  const speciesList = color.domain();
  let activeSpecies = new Set(speciesList);

  const legend = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top / 2})`);

  legend
    .selectAll("g")
    .data(speciesList)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(${i * 120},0)`)
    .style("cursor", "pointer")
    .on("click", (e, s) => {
      if (activeSpecies.has(s)) activeSpecies.delete(s);
      else activeSpecies.add(s);
      d3.select(e.currentTarget)
        .select("rect")
        .transition()
        .duration(300)
        .attr("stroke-width", activeSpecies.has(s) ? 0 : 2);
      updateFilter();
    })
    .call((g) => {
      g.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", (d) => color(d))
        .attr("stroke", "black")
        .attr("stroke-width", 0);
      g.append("text")
        .attr("x", 16)
        .attr("y", 10)
        .text((d) => d);
    });

  function updateFilter() {
    cellGroup
      .selectAll("path.point")
      .transition()
      .duration(300)
      .attr("opacity", (d) => (activeSpecies.has(d.species) ? 1 : 0.1));
  }

  // ── matrix container ───────────────────────────────────
  const cellGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // draw each cell
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const xVar = vars[col],
        yVar = vars[row];
      const cell = cellGroup
        .append("g")
        .attr("transform", `translate(${col * cellSize},${row * cellSize})`);

      // frame
      cell
        .append("rect")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", "none")
        .attr("stroke", "#ccc");

      // points
      cell
        .selectAll("path")
        .data(data)
        .enter()
        .append("path")
        .attr("class", "point")
        .attr("d", triPath)

        // store local coords for brushing
        .attr("data-x", (d) => xScales[xVar](d[xVar]) + col * cellSize)
        .attr("data-y", (d) => yScales[yVar](d[yVar]) + row * cellSize)
        .attr("transform", (d) => {
          const x = xScales[xVar](d[xVar]),
            y = yScales[yVar](d[yVar]),
            flip = d.sex === "Female" ? 180 : 0;
          return `translate(${x},${y}) rotate(${flip}) rotate(${islandAngle(
            d.island
          )})`;
        })
        .attr("fill", (d) => color(d.species))
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .attr("opacity", 1);
    }
  }

  // ── Axis labels & FACETING hint ───────────────────────────
  vars.forEach((v, i) => {
    // x-label
    cellGroup
      .append("text")
      .attr("x", i * cellSize + cellSize / 2)
      .attr("y", n * cellSize + 15)
      .attr("text-anchor", "middle")
      .text(v.replace(/_/g, " "));
    // y-label
    cellGroup
      .append("text")
      .attr(
        "transform",
        `translate(-15,${i * cellSize + cellSize / 2}) rotate(-90)`
      )
      .attr("text-anchor", "middle")
      .text(v.replace(/_/g, " "));
  });

  // ── MANIPULATION: brushing ─────────────────────────────────
  const brush = d3
    .brush()
    .extent([
      [0, 0],
      [n * cellSize, n * cellSize],
    ])
    .on("start brush end", brushed);

  cellGroup.append("g").attr("class", "brush").call(brush);

  function brushed({ selection }) {
    if (!selection) {
      cellGroup
        .selectAll("path.point")
        .transition()
        .duration(200)
        .attr("stroke-width", 0.5)
        .attr("opacity", (d) => (activeSpecies.has(d.species) ? 1 : 0.1));
      return;
    }
    const [[x0, y0], [x1, y1]] = selection;
    cellGroup.selectAll("path.point").each(function (d) {
      const px = +this.getAttribute("data-x"),
        py = +this.getAttribute("data-y"),
        inside = x0 <= px && px <= x1 && y0 <= py && py <= y1;
      d3.select(this)
        .transition()
        .duration(200)
        .attr("stroke-width", inside ? 2 : 0.5)
        .attr("opacity", inside ? 1 : 0.1);
    });
  }

  // ── FACETING: double-click to split by species ─────────────
  let faceted = false;
  svg.on("dblclick", () => {
    if (!faceted) {
      // fade out overview
      svg
        .selectAll("*")
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();

      // draw one matrix per species
      speciesList.forEach((sp, i) => {
        const subset = data.filter((d) => d.species === sp);
        const originX =
          margin.left + i * (innerW / speciesList.length + margin.right);
        const gSp = svg
          .append("g")
          .attr("transform", `translate(${originX},${margin.top})`)
          .style("opacity", 0);

        // small-multiple matrix
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            const xVar2 = vars[c],
              yVar2 = vars[r];
            const cell2 = gSp
              .append("g")
              .attr("transform", `translate(${c * cellSize},${r * cellSize})`);

            cell2
              .append("rect")
              .attr("width", cellSize)
              .attr("height", cellSize)
              .attr("fill", "none")
              .attr("stroke", "#ccc");

            cell2
              .selectAll("path")
              .data(subset)
              .enter()
              .append("path")
              .attr("d", triPath)
              .attr("transform", (d) => {
                const xx = xScales[xVar2](d[xVar2]),
                  yy = yScales[yVar2](d[yVar2]),
                  flip = d.sex === "Female" ? 180 : 0;
                return `translate(${xx},${yy}) rotate(${flip}) rotate(${islandAngle(
                  d.island
                )})`;
              })
              .attr("fill", color(sp))
              .attr("stroke", "black")
              .attr("stroke-width", 0.5)
              .attr("opacity", 1);
          }
        }

        // species title
        gSp
          .append("text")
          .attr("x", (n * cellSize) / 2)
          .attr("y", -6)
          .attr("text-anchor", "middle")
          .text(sp);

        gSp.transition().duration(500).style("opacity", 1);
      });

      faceted = true;
    } else {
      // reset
      drawScatterMatrix(data);
      faceted = false;
    }
  });
}
// #endregion Scatter plot matrix

// Draw both plots
drawHeatmap(penguins);
drawScatter(penguins);
drawScatterMatrix(penguins);
