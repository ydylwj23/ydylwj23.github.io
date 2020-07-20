// set the dimensions and margins of the graph
var margin = { top: 10, right: 30, bottom: 30, left: 60 },
  width = 1000 - margin.left - margin.right,
  height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform",
    "translate(" + margin.left + "," + margin.top + ")");

// time parser and formater
var formatDateIntoYear = d3.timeFormat("%Y");
var formatDate = d3.timeFormat("%b %Y");
var parseDate = d3.timeParse("%m-%Y");

// tooltip
// var tooltip = d3.select("body").append("div").attr("class", "tooltip");
// const tooltip = d3.select('#tooltip');
var tooltip = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("visibility", "hidden")
  .text("a simple tooltip");
const tooltipLine = svg.append('line');


//Read the data
d3.csv("rates.csv", function (data) {

  //parse date and rate number
  data.forEach(function (d) {
    d.date = parseDate(d.date);
    d.Fed = parseInt(d.Fed);
    d.Mortgage = parseInt(d.Mortgage);
  });

  //create subset fed and mortgage data set
  var fed = {
    key: 'fed',
    values: data.map(function (d) {
      return {
        date: d.date,
        rate: d.Fed
      };
    })
  };
  var mortgage = {
    key: 'mortgage',
    values: data.map(function (d) {
      return {
        date: d.date,
        rate: d.Mortgage
      };
    })
  };
  var dataset = [fed, mortgage]

  // Add X axis --> it is a date format
  var dates = d3.extent(data, function (d) { return d.date; })
  var x = d3.scaleTime()
    .domain(dates)
    .range([0, width]);
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([0, d3.max(data, function (d) { return Math.max(d.Fed, d.Mortgage); })])
    .range([height, 0]).nice();
  svg.append("g")
    .attr("transform", "translate(-1, 0)")
    .call(d3.axisLeft(y));

  // color palette
  var res = dataset.map(function (d) { return d.key }) // list of group names
  var color = d3.scaleOrdinal()
    .domain(res)
    .range(['#e41a1c', '#377eb8'])

  // Draw the lines
  svg.selectAll(".line")
    .data(dataset)
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("stroke", function (d) { return color(d.key) })
    .attr("stroke-width", 1.5)
    .attr("d", function (d) {
      return d3.line()
        .x(function (d) { return x(d.date); })
        .y(function (d) { return y(d.rate); })
        (d.values)
    })

  //tooltip canvas
  var tipBox = svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('opacity', 0)
    .on('mouseover', () => {
      tooltip.style('visibility', 'visible');
      tooltipLine.attr('stroke', 'black');
    })
    .on('mousemove', () => {
      var dateRaw = x.invert(d3.mouse(tipBox.node())[0])
      var date = formatDate(dateRaw);
      tooltipLine
        .attr('x1', x(dateRaw))
        .attr('x2', x(dateRaw))
        .attr('y1', 0)
        .attr('y2', height);

      tooltip.html(date)
        .style('left', (d3.event.pageX + 20) + "px")
        .style('top', (d3.event.pageY - 20) + "px")
        .selectAll()
        .data(dataset).enter()
        .append('div')
        .style('color', d => color(d.key))
        .html(d => d.key + ': ' + d.values.find(h => {
          var formated = formatDate(h.date);
          if (date === 'Mar 1971') {
            return formated === 'Apr 1971';
          }
          return formated === date;
        }).rate + '%');
    })
    .on('mouseout', () => {
      if (tooltip) tooltip.style('visibility', 'hidden');
      if (tooltipLine) tooltipLine.attr('stroke', 'none');
    });

  // /* Add 'curtain' rectangle to hide entire graph */
  var curtain = svg.append('rect')
    .attr('x', -1 * width)
    .attr('y', -1 * height)
    .attr('height', height)
    .attr('width', width)
    .attr('class', 'curtain')
    .attr('transform', 'rotate(180)')
    .style('fill', '#ffffff')
    .style('opacity', 1)
    .style('position', "absolute")
    .style('z-index', -1)

  //update the chart
  var updateChart = t => {
    curtain.attr('width', width - x(t))
  };

  //build the slider
  var startDate = dates[0],
    endDate = dates[1];

  var svgSlider = d3.select("#slider")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height / 4);

  //x axis for slider
  var xSlider = d3.scaleTime()
    .domain([startDate, endDate])
    .range([0, width])
    .clamp(true);

  var slider = svgSlider.append("g")
    .attr("class", "slider")
    .attr("transform", "translate(" + margin.left + "," + height / 8 + ")");

  slider.append("line")
    .attr("class", "track")
    .attr("x1", xSlider.range()[0])
    .attr("x2", xSlider.range()[1])
    .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
    .attr("class", "track-inset")
    .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
    .attr("class", "track-overlay")
    .call(d3.drag()
      .on("start.interrupt", function () {
        slider.interrupt();
        curtain.interrupt();
      })
      .on("start drag", function () { update(xSlider.invert(d3.event.x)); }));

  slider.insert("g", ".track-overlay")
    .attr("class", "ticks")
    .attr("transform", "translate(0," + 18 + ")")
    .selectAll("text")
    .data(xSlider.ticks(10))
    .enter()
    .append("text")
    .attr("x", xSlider)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .text(function (d) { return formatDateIntoYear(d); });

  var handle = slider.insert("circle", ".track-overlay")
    .attr("class", "handle")
    .attr("r", 9);

  var label = slider.append("text")
    .attr("class", "label")
    .attr("text-anchor", "middle")
    .text(formatDate(startDate))
    .attr("transform", "translate(0," + (-25) + ")")

  //update the slider
  var update = h => {
    // update position and text of label according to slider scale
    handle.attr("cx", xSlider(h));
    label
      .attr("x", xSlider(h))
      .text(formatDate(h));

    updateChart(h);
  }

  ///legend
  // create a list of keys
  var legends = ["Federal Funds Rate", "30-Year Fixed Mortage Rate"]

  // Add one dot in the legend for each name.
  svg.selectAll("mydots")
    .data(legends)
    .enter()
    .append("circle")
    .attr("cx", 100)
    .attr("cy", function (d, i) { return 100 + i * 25 }) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("r", 7)
    .style("fill", function (d) { return color(d) })

  // Add one dot in the legend for each name.
  svg.selectAll("mylabels")
    .data(legends)
    .enter()
    .append("text")
    .attr("x", 120)
    .attr("y", function (d, i) { return 100 + i * 25 }) // 100 is where the first dot appears. 25 is the distance between dots
    .style("fill", function (d) { return color(d) })
    .text(function (d) { return d })
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle")

  ////annotation
  const label1 = [{
    note: {
      label: "A different annotation type",
      title: "d3.annotationCalloutCircle",
      wrap: 190
    },
    //settings for the subject, in this case the circle radius
    subject: {
      radius: 50
    },
    connector: {
      end: "arrow",
    },
    x: 200,
    y: 200,
    dy: -80,
    dx: 102
  }]
  const makeAnnotation1 = d3.annotation()
    .annotations(label1)
    .type(d3.annotationCalloutCircle)
  d3.select("svg")
    .append("g")
    .attr("id", "annotation1")
    .call(makeAnnotation1)
  var l1 = d3.select('#annotation1')

  const label2 = [{
    note: {
      label: "A different annotation type",
      title: "d3.annotationCalloutCircle",
      wrap: 190
    },
    //settings for the subject, in this case the circle radius
    subject: {
      radius: 50
    },
    connector: {
      end: "arrow",
    },
    x: 300,
    y: 200,
    dy: -80,
    dx: 102
  }]
  const makeAnnotation2 = d3.annotation()
    .annotations(label2)
    .type(d3.annotationCalloutCircle)
  d3.select("svg")
    .append("g")
    .attr("id", "annotation2")
    .call(makeAnnotation2)
  var l2 = d3.select('#annotation2')

  const label3 = [{
    note: {
      label: "A different annotation type",
      title: "d3.annotationCalloutCircle",
      wrap: 190
    },
    //settings for the subject, in this case the circle radius
    subject: {
      radius: 50
    },
    connector: {
      end: "arrow",
    },
    x: 400,
    y: 200,
    dy: -80,
    dx: 102
  }]
  const makeAnnotation3 = d3.annotation()
    .annotations(label3)
    .type(d3.annotationCalloutCircle)
  d3.select("svg")
    .append("g")
    .attr("id", "annotation3")
    .call(makeAnnotation3)
  var l3 = d3.select('#annotation3')

  //button event
  d3.select("#button1")
    .on('click', () => scene(1));
  d3.select("#button2")
    .on('click', () => scene(2));
  d3.select("#button3")
    .on('click', () => scene(3));
  d3.select("#button4")
    .on('click', () => scene(4));

  var scene = n => {
    curtain.interrupt();
    if (n === 4) {
      l1.style('display', 'none')
      l2.style('display', 'none')
      l3.style('display', 'none')
      updateChart(startDate);
    } else if (n === 1) {
      updateChart(startDate);
      l1.style('display', 'none')
      l2.style('display', 'none')
      l3.style('display', 'none')
      curtain
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('width', width - x(parseDate('08-1980')))
        .on('end', () => l1.style('display', 'inline-block'));
    } else if (n === 2) {
      l1.style('display', 'inline-block')
      l2.style('display', 'none')
      l3.style('display', 'none')
      curtain
        .attr('width', width - x(parseDate('08-1980')));
      curtain
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('width', width - x(parseDate('08-1990')))
        .on('end', () => l2.style('display', 'inline-block'));
    } else if (n === 3) {
      l1.style('display', 'inline-block')
      l2.style('display', 'inline-block')
      l3.style('display', 'none')
      curtain
        .attr('width', width - x(parseDate('08-1990')));
      curtain
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('width', width - x(parseDate('03-2018')))
        .on('end', () => l3.style('display', 'inline-block'));
    }
  }

  //start with Reset state
  scene(4);

})

