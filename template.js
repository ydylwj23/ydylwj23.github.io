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

var textTitle = d3.select('#title');
var textContent = d3.select('#content');

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

var currentScene;


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
    curtain.interrupt();
    handle.interrupt();
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
    .attr("cx", 700)
    .attr("cy", function (d, i) { return 50 + i * 25 }) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("r", 7)
    .style("fill", function (d) { return color(d) })

  // Add one dot in the legend for each name.
  svg.selectAll("mylabels")
    .data(legends)
    .enter()
    .append("text")
    .attr("x", 720)
    .attr("y", function (d, i) { return 50 + i * 25 }) // 100 is where the first dot appears. 25 is the distance between dots
    .style("fill", function (d) { return color(d) })
    .text(function (d) { return d })
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle")

  ////annotation
  const label1 = [{
    note: {
      label: "Highest fedral funds rate and mortage rate since 1971",
      wrap: 190
    },
    //settings for the subject, in this case the circle radius
    subject: {
      radius: 50
    },
    connector: {
      end: "arrow",
    },
    x: 260,
    y: 70,
    dy: -10,
    dx: 60
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
      label: "Recession in the 90s",
      wrap: 190
    },
    //settings for the subject, in this case the circle radius
    subject: {
      radius: 50
    },
    connector: {
      end: "arrow",
    },
    x: 490,
    y: 270,
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
      label: "Early 2000s recession",
      wrap: 190
    },
    //settings for the subject, in this case the circle radius
    subject: {
      radius: 50
    },
    connector: {
      end: "arrow",
    },
    x: 690,
    y: 305,
    dy: -100,
    dx: 82
  }]
  const makeAnnotation3 = d3.annotation()
    .annotations(label3)
    .type(d3.annotationCalloutCircle)
  d3.select("svg")
    .append("g")
    .attr("id", "annotation3")
    .call(makeAnnotation3)
  var l3 = d3.select('#annotation3')


  const label4 = [{
    note: {
      label: "Subprime mortgage crisis",
      wrap: 190
    },
    //settings for the subject, in this case the circle radius
    subject: {
      radius: 50
    },
    connector: {
      end: "arrow",
    },
    x: 800,
    y: 330,
    dy: -80,
    dx: 50
  }]
  const makeAnnotation4 = d3.annotation()
    .annotations(label4)
    .type(d3.annotationCalloutCircle)
  d3.select("svg")
    .append("g")
    .attr("id", "annotation4")
    .call(makeAnnotation4)
  var l4 = d3.select('#annotation4')

  //button event
  d3.select("#button1")
    .on('click', () => scene(1));
  d3.select("#button2")
    .on('click', () => scene(2));
  d3.select("#button3")
    .on('click', () => scene(3));
  d3.select("#button4")
    .on('click', () => scene(4));
  d3.select("#button5")
    .on('click', () => scene(5));
  d3.select("#next")
    .on('click', () => {
      if (currentScene < 5) {
        scene(currentScene + 1);
      }
    });
  d3.select("#reset")
    .on('click', () => scene(0));


  var scene = n => {
    //update scene number
    currentScene = n;
    //special dates
    var date1 = parseDate('06-1984');
    var date2 = parseDate('04-1996');
    var date3 = parseDate('08-2006');
    var date4 = parseDate('05-2012');

    if (n === 0) { //reset scene
      update(startDate);
      l1.style('display', 'none')
      l2.style('display', 'none')
      l3.style('display', 'none')
      l4.style('display', 'none')
      changeText("Myth?", "FOMC can adjust federal funds rate which directly impacts bank's products like savings account and CD rates.<br><br>But does it have same influence over the mortgage rate?");
    } else if (n === 1) {
      update(startDate);
      l1.style('display', 'none')
      l2.style('display', 'none')
      l3.style('display', 'none')
      l4.style('display', 'none')
      HCto(date1, l1, 2000)
      changeText("Collapse of Bretton Woods", "Marked by the collapse of Bretton Woods, US market faced great inflation during the 70s. To combat it, the federal funds rate was adjusted to a very high point.<br><br>During this time, the 30-year fixed mortgage rate also reached its highest point since 1971.");
    } else if (n === 2) {
      update(date1);
      l1.style('display', 'inline-block')
      l2.style('display', 'none')
      l3.style('display', 'none')
      l4.style('display', 'none')
      HCto(date2, l2, 2000)
      changeText("Recession in the 90s", "The 1990s began with a recession right out of the gate, although it lasted only eight months. The FOMC reduced fed funds rate through 1993 as it fought the recession.<br><br>The mortgage rate reacted to this by dropping as well, though not as much as the federal funds rate.");
    } else if (n === 3) {
      update(date2);
      l1.style('display', 'inline-block')
      l2.style('display', 'inline-block')
      l3.style('display', 'none')
      l4.style('display', 'none')
      HCto(date3, l3, 1000)
      changeText("Down again", "The aughts are known for their tumult. The the dot-com market crash, the terrorist attacks of 9/11 and a brief recession drove rates lower in the first half of the decade.");
    } else if (n === 4) {
      update(date3);
      l1.style('display', 'inline-block')
      l2.style('display', 'inline-block')
      l3.style('display', 'inline-block')
      l4.style('display', 'none')
      HCto(date4, l4, 500)
      changeText("The big bubble burst", "In the midst of the worst economic crisis since the Great Depression, the FOMC switched up their protocol once again, deciding in December 2008 to set a target range for federal funds, instead of a single rate. Since this is when the fed funds rate was at its lowest, we’re really looking at the lowest range in this instance. The lower limit of this band at the time was 0% and the upper limit was 0.25%.<br><br>Although it is pretty obvious that the mortgage rate cannot drop to 0, it still followed the trend and took same amount of time to recover from this.");
    } else if (n === 5) {
      update(date4);
      l1.style('display', 'inline-block')
      l2.style('display', 'inline-block')
      l3.style('display', 'inline-block')
      l4.style('display', 'inline-block')
      HCto(endDate, l4, 500)
      changeText("Conclusion", "As we can see, the Fed’s actions do indirectly influence the rates consumers pay on their fixed-rate home loans when they refinance or take out a new mortgage even though the Federal Reserve does not impact what happens to mortgage rates as directly as they do other products like savings account and CD rates.");
    }
  }
  //embed new text
  var changeText = (t, c) => {
    textTitle.html(t);
    textContent.html(c);
  }
  //handle and curtain to location with transition
  var HCto = (m, l, t) => {
    label
      .style('display', 'none');
    curtain
      .transition()
      .duration(t)
      .ease(d3.easeLinear)
      .attr('width', width - x(m))
      .on('end', () => {
        l.style('display', 'inline-block');
        label.attr("x", x(m)).text(formatDate(m)).style('display', 'inline-block');
      });
    handle
      .transition()
      .duration(t)
      .ease(d3.easeLinear)
      .attr('cx', x(m))
  }

  //start with Reset state
  scene(0);

})

