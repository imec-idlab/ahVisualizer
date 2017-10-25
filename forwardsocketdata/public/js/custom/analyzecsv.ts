/// <reference path="../../../typings/globals/sql.js/index.d.ts" />

var headers: string[];

interface Line {
    [name: string]: Entry;
}
var lines: Line[];


interface SeriesValuesCollection {
    [key: string]: SeriesValues;
}
class SeriesValues {
    name: string = "";
    xValues: number[] = [];
    yValues: number[] = [];
    tags: string[] = [];
    lines: Line[] = [];
}
var seriesValues: SeriesValuesCollection = {};

var chart: HighchartsChartObject;

function handleFiles(files) {
    getAsText(files[0]);
}

function getAsText(fileToRead) {
    var reader = new FileReader();
    // Read file into memory as UTF-8      
    reader.readAsText(fileToRead);
    // Handle errors load
    reader.onload = ev => {
        var csv = (<any>ev).target.result;
        processData(csv);
        distinctValueCache = {}; // clear the distinct value cache

        fillDropdowns();
        let isLoaded = loadConfigurationFromHash();
        if (!isLoaded)
            dropdownChanged();

    };

    reader.onerror = ev => {
        alert("Unable to load csv file");
    };
}

class Entry {

    constructor(line: string) {
        var parts = line.split(",");

        this.isNumber = /^[-+]?(\d+|\d+\.\d*|\d*\.\d+)$/.test(parts[0]);
        if (this.isNumber)
            this.value = Math.round(parseFloat(parts[0]) * 10) / 10;
        else
            this.value = parts[0];

        if (parts.length > 1) {
            this.hasDetails = true;
            this.q1 = parseFloat(parts[1]);
            this.median = parseFloat(parts[2]);
            this.q3 = parseFloat(parts[3]);
            this.min = parseFloat(parts[4]);
            this.max = parseFloat(parts[5]);
        }
        else {
            this.hasDetails = false;
        }
    }

    compareTo(e: Entry): number {
        if (typeof e == "undefined")
            return -1;

        if (e.isNumber) {
            return this.value - e.value;
        }
        else {
            return this.value == e.value ? 0 : (this.value > e.value ? 1 : -1);
        }
    }

    value: any;
    isNumber: boolean;
    hasDetails: boolean;

    q1: number;
    median: number;
    q3: number;
    min: number;
    max: number;
}


function processData(csv) {
    var allTextLines = csv.split(/\r\n|\n/);

    lines = [];
    for (var i = 0; i < allTextLines.length; i++) {

        if (allTextLines[i] != "") {
            if (i == 0)
                headers = allTextLines[i].split(';');
            else {
                var parts: string[] = allTextLines[i].split(';');
                var obj: Line = {};
                for (let j: number = 0; j < parts.length; j++) {
                    obj[headers[j]] = new Entry(parts[j]);
                }
                lines.push(obj);
            }
        }
    }
}

function fillDropdowns() {
    var ddls = $(".ddl");

    ddls.empty();
    for (let header of headers.sort()) {

        ddls.append($('<option></option>').val(header).html(header));
    }

    if (headers.indexOf("Name") != -1) {
        $("#ddlTag").val("Name");
    }
}

function dropdownChanged() {

    //  fill fixed remaining properties
    var otherProperties = [];

    var dynamicProperties = [$("#ddlXValues").val(), $("#ddlYValues").val()];
    var seriesVal = $("#ddlSeries").val();
    if (!(seriesVal instanceof Array))
        seriesVal = [seriesVal];
    for (let h of seriesVal)
        dynamicProperties.push(h);

    for (let h of headers) {
        let isDynamicProp = false;
        for (let p of dynamicProperties) {
            if (h == p) { isDynamicProp = true; break; }
        }
        if (!isDynamicProp)
            otherProperties.push(h);
    }



    // try and save the fixed prop values
    var fixedPropState = {};
    var fixedProps = $(".ddlFixedProp");
    for (let i: number = 0; i < fixedProps.length; i++) {
        var prop = $($(fixedProps).get(i));
        fixedPropState[prop.attr("data-prop")] = prop.val();
    }

    $("#frmFixedValues").empty();
    if (otherProperties.length > 0) {
        for (let h of otherProperties.sort()) {

            $("#frmFixedValues").append(`<div class="form-group">
                        <label for="ddlFixedProp${h}" class="col-sm-3 control-label">${h}</label>
                        <div class="col-sm-9">
                            <select id="ddlFixedProp${h}" class="form-control ddlFixedProp" data-prop="${h}"></select>
                        </div>
                    </div>`);

            var ddl = $("#ddlFixedProp" + h);
            var values = getDistinctValuesFor(h);
            if (values.length > 200) // way too many
                values = ["Too many to list"];

            let html = "";
            html += `<option value="">[Ignore]</option>`;
            for (let v of values)
                html += `<option value="${v}">${v}</option>`;

            ddl.get(0).innerHTML = html; //.html(html);
            if (values.length == 1)
                ddl.closest(".form-group").hide();
        }

        // restore if possible
        fixedProps = $(".ddlFixedProp");
        for (let i: number = 0; i < fixedProps.length; i++) {
            var prop = $($(fixedProps).get(i));
            if (typeof fixedPropState[prop.attr("data-prop")] != "undefined") {
                prop.val(fixedPropState[prop.attr("data-prop")]);
            }
        }
    }
    else
        $("#frmFixedValues").append("No fixed values");
}


var distinctValueCache = {};
function getDistinctValuesFor(header: string): any[] {
    if (typeof distinctValueCache[header] != "undefined")
        return distinctValueCache[header];


    let isNumeric: boolean = false;
    let distinctValues = {};
    for (let l of lines) {
        if (typeof l[header] != "undefined") {
            distinctValues[l[header].value] = true;
            isNumeric = l[header].isNumber;
        }
    }

    let arr: any[] = [];
    for (let p in distinctValues) {
        if (p != "undefined" && distinctValues.hasOwnProperty(p)) {
            arr.push(p);
        }
    }
    if (isNumeric)
        distinctValueCache[header] = arr.sort((a, b) => { return a - b; });
    else
        distinctValueCache[header] = arr.sort();
    return distinctValueCache[header];
}

function getFixedValues() {
    var fixedVals = {};

    var fixedProps = $(".ddlFixedProp");

    for (let i: number = 0; i < fixedProps.length; i++) {
        var prop = $($(fixedProps).get(i));
        if (prop.val() != "") { // otherwise ignore = matches
            var header = prop.attr("data-prop");

            var fixedValue;
            if (/^[-+]?(\d+|\d+\.\d*|\d*\.\d+)$/.test(prop.val()))
                fixedValue = Math.round(parseFloat(prop.val()) * 10) / 10;
            else
                fixedValue = prop.val();

            fixedVals[header] = fixedValue;
        }
    }
    return fixedVals;
}
function matchesFixedValues(line: Line, fixedVals: any) {
    for (let p in fixedVals) {
        if (fixedVals.hasOwnProperty(p)) {
            if (line[p].value != fixedVals[p])
                return false;
        }
    }
    return true;
}

function getFormattedPropertyValues(line: Line) {
    var selectedTagIdx = $("#ddlTag").val();


    let str = "<table>";
    for (let h of headers) {
        if (h != selectedTagIdx) {
            str += "<tr>";

            str += "<td>" + h + "</td>";
            str += "<td>" + line[h].value + "</td>";
            str += "</tr>";
        }
    }
    str += "</table>";
    return str;
}


$(document).on("click", "#btnRender", ev => {

    var selectedXValueIdx = $("#ddlXValues").val();
    var selectedYValueIdx = $("#ddlYValues").val();
    var selectedSeriesIdx = $("#ddlSeries").val();

    seriesValues = {};

    // make it an array to be consistent
    if (!(selectedSeriesIdx instanceof Array))
        selectedSeriesIdx = [selectedSeriesIdx];

    var selectedTagIdx = $("#ddlTag").val();

    var fixedValues = getFixedValues();

    var sortedLines = lines.sort((a, b) => { return a[selectedXValueIdx].compareTo(b[selectedXValueIdx]); });
    for (let l of sortedLines) {

        let isValid: boolean = true;
        let nameParts: string[] = [];
        let keyParts: any[] = [];
        for (let ss of selectedSeriesIdx) {
            if (typeof l[ss] == "undefined") {
                isValid = false;
                break;
            }
            keyParts.push(l[ss].value);
            nameParts.push(ss + ":" + l[ss].value);
        }

        if (isValid) {
            let key: string = keyParts.join("__");

            var sv: SeriesValues;
            if (!seriesValues.hasOwnProperty(key)) {
                sv = new SeriesValues();
                sv.name = nameParts.join(",");
                seriesValues[key] = sv;
            }
            else {
                sv = seriesValues[key];
            }

            if (matchesFixedValues(l, fixedValues)) {
                sv.xValues.push(l[selectedXValueIdx].value);
                sv.yValues.push(l[selectedYValueIdx].value);
                sv.tags.push(l[selectedTagIdx].value);
                sv.lines.push(l);
            }
        }
    }


    var series = [];

    let seriesKeys: string[] = [];
    for (let serieValue in seriesValues) {
        if (typeof serieValue != "undefined" && seriesValues.hasOwnProperty(serieValue))
            seriesKeys.push(serieValue);
    }

    // build series, sort by series names
    for (let serieValue of seriesKeys.sort(function (a, b) { return seriesValues[a].name == seriesValues[b].name ? 0 : (seriesValues[a].name > seriesValues[b].name ? 1 : -1); })) {
        let sv: SeriesValues = seriesValues[serieValue];
        var tuples = [];
        for (let i: number = 0; i < sv.xValues.length; i++) {
            tuples.push({ x: sv.xValues[i], y: sv.yValues[i], tag: sv.tags[i], line: sv.lines[i] });
        }
        series.push({
            name: sv.name,
            data: tuples
        });
    }

    chart.xAxis[0].setTitle({ text: selectedXValueIdx }, false);
    chart.yAxis[0].setTitle({ text: selectedYValueIdx }, false);
    chart.options.plotOptions.scatter.lineWidth = $("#chkConnectPoints").prop("checked") ? 2 : 0;

    if (chart.series.length <= series.length) {
        // replace data of charts up to chart.series.length
        for (let i = 0; i < chart.series.length; i++) {
            chart.series[i].setData(series[i].data, false);
        }
        // add the remainder
        for (let i = chart.series.length; i < series.length; i++)
            chart.addSeries(series[i], false);
    }
    else if (chart.series.length > series.length) {
        // replace data of charts up to chart.series.length
        for (let i = 0; i < series.length; i++) {
            chart.series[i].setData(series[i].data, false);
        }
        // remove series that are not applicable
        for (let i = chart.series.length - 1; i >= series.length; i--) {
            chart.series[i].remove(false);
        }
    }

    // auto hide series without points
    for (let i = 0; i < chart.series.length; i++) {
        chart.series[i].update(<any>{ name: series[i].name, lineWidth: $("#chkConnectPoints").prop("checked") ? 2 : 0 }, false);

        if (series[i].data.length == 0)
            chart.series[i].hide();
        else
            chart.series[i].show();
    }

    chart.redraw(true);

    $("#ddlBoxPlotSeries").empty();
    for (let serieValue of seriesKeys.sort(function (a, b) { return seriesValues[a].name == seriesValues[b].name ? 0 : (seriesValues[a].name > seriesValues[b].name ? 1 : -1); }))
        $("#ddlBoxPlotSeries").append($('<option></option>').val(serieValue).html(seriesValues[serieValue].name));
});


function buildBoxPlotChart() {

    var selectedXValueIdx = $("#ddlXValues").val();
    var selectedYValueIdx = $("#ddlYValues").val();
    var selectedSeriesIdx = $("#ddlSeries").val();


    var selectedSeries = $("#ddlBoxPlotSeries").val();

    var sv: SeriesValues = seriesValues[selectedSeries];

    var data = [];
    var avgData = [];
    for (let i = 0; i < sv.lines.length; i++) {
        let entry = sv.lines[i][selectedYValueIdx];
        if (entry.hasDetails)
            data.push([entry.min, entry.q1, entry.median, entry.q3, entry.max]);
        else
            data.push([]);

        avgData.push([i, sv.lines[i][selectedYValueIdx].value]);
    }

    var categories = [];
    for (let i = 0; i < sv.xValues.length; i++)
        categories.push(sv.xValues[i]);

    $('#boxPlotContainer').highcharts({
        chart: {
            type: 'boxplot',
            zoomType: "xy"
        },
        title: {
            text: ''
        },
        legend: {
            enabled: false
        },
        xAxis: {
            categories: categories,
            title: {
                text: selectedXValueIdx
            }
        },
        yAxis: {
            title: {
                text: selectedYValueIdx
            }
        },
        series: [{
            name: $("#ddlBoxPlotSeries option:selected").text(),
            data: data
        }, <any>{
            name: 'Average',

            type: 'scatter',
            data: avgData,
            marker: {
                fillColor: 'red',
                lineWidth: 1,
                lineColor: Highcharts.getOptions().colors[0]
            },
            tooltip: {
                pointFormat: 'Average: {point.y}'
            }
        }],
        credits: false
    });
}


function initChart() {
    chart = new Highcharts.Chart({
        chart: {
            type: 'scatter',
            renderTo: "chartContainer",
            zoomType: "xy",
            animation: false
        },
        title: "",
        plotOptions: {
            scatter: {
                lineWidth: $("#chkConnectPoints").prop("checked") ? 2 : 0
            },
            series: {
                turboThreshold: 10000,
                animation: false
            }
        },
        colors: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#888888", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#000000"],
        xAxis: {

            title: { text: "" }
        },
        yAxis: {
            title: { text: "" }
        },
        tooltip: {
            useHTML: true,
            formatter: function () {
                return this.point.tag + "<hr/>" + getFormattedPropertyValues(this.point.line);
            }
        },
        series: [],
        credits: false,
        exporting: {
            chartOptions: {
                title: {
                    text: ''
                }
            }
        }
    });
}

function saveConfigurationInHash() {
    var selectedXValueIdx = $("#ddlXValues").val();
    var selectedYValueIdx = $("#ddlYValues").val();
    var selectedSeriesIdx = $("#ddlSeries").val();
    var selectedTagIdx = $("#ddlTag").val();

    let obj: any = {};
    obj.XValues = selectedXValueIdx;
    obj.YValues = selectedYValueIdx;
    obj.Series = selectedSeriesIdx;
    obj.Tag = selectedTagIdx;

    var fixedProps = $(".ddlFixedProp");
    for (let i: number = 0; i < fixedProps.length; i++) {
        var prop = $($(fixedProps).get(i));
        obj[prop.attr("data-prop")] = prop.val();
    }
    window.location.hash = $.param(obj);
}

var QueryStringToHash = function QueryStringToHash(query) {
    var query_string = {};
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair: string[] = vars[i].split("=");
        pair[0] = decodeURIComponent(pair[0]);
        pair[1] = decodeURIComponent(pair[1]);

        pair[0] = pair[0].replace("[]", "");

        // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = pair[1];
            // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [query_string[pair[0]], pair[1]];
            query_string[pair[0]] = arr;
            // If third or later entry with this name
        } else {
            query_string[pair[0]].push(pair[1]);
        }
    }
    return query_string;
};

function loadConfigurationFromHash(): boolean {
    if (window.location.hash != "") {
        let obj: any = QueryStringToHash(window.location.hash.substr(1));
        if (obj.XValues) $("#ddlXValues").val(obj.XValues);
        if (obj.YValues) $("#ddlYValues").val(obj.YValues);
        if (obj.Series) $("#ddlSeries").val(obj.Series);

        // ensure visibility of correct fixed props 
        dropdownChanged();

        for (let p in obj) {
            if (obj.hasOwnProperty(p) && p != "XValues" && p != "YValues" && p != "Series" && p != "Tag") {
                $(".ddlFixedProp[data-prop='" + p + "']").val(obj[p]);
            }
        }
        return true;
    }
    return false;
}





$(document).on("change", "#csvFileInput", function (ev) {
    handleFiles(this.files);
});

$(document).on("change", ".ddl", function (ev) {
    dropdownChanged();
    saveConfigurationInHash();
});

$(document).on("change", ".ddlFixedProp", function (ev) {
    saveConfigurationInHash();
});

$(document).on("change", "#ddlBoxPlotSeries", function (ev) {
    buildBoxPlotChart();
});

$(document).on("click", "#btnCreateDB", function (ev) {
    //Create the database
    var suffix = ["_max", "_min", "_median", "_q1", "_q3", "_avg"];

    var colnames = [];
    if (lines.length > 0) {
        let db = new SQL.Database();

        let cols: string[] = [];
        for (let i = 0; i < headers.length; i++) {
            let name = headers[i];
            let type = lines[0][name].isNumber ? "double" : "char";

            if (type == "char" || !lines[0][name].hasDetails) {
                cols.push(name + " " + type);
                colnames.push(name);
            }
            else {
                for (let s of suffix) {
                    cols.push(name + s + " " + type);
                    colnames.push(name + s);
                }
            }
        }

        var colStr = "(" + cols.join(", ") + ")";
        db.exec("CREATE TABLE results " + colStr);


        var headerStr = "(" + colnames.join(", ") + ")";


        $("#sqlGenerateProgressBar").show();

        doFor<Line>(lines, l => {
            //for (let l of lines) {
            var values = [];



            for (let h of headers) {
                let isDetailed = lines[0][h].isNumber && lines[0][h].hasDetails;

                if (!isDetailed) {
                    if (lines[0][h].isNumber)
                        values.push(typeof l[h].value != "undefined" && !isNaN(l[h].value) ? l[h].value : "NULL");
                    else
                        values.push("'" + l[h].value + "'"); // don't be a dick and add "'" in the strings now
                }
                else {
                    for (let s of suffix) {
                        switch (s) {
                            case "_max":
                                values.push(typeof l[h].max != "undefined" && !isNaN(l[h].max) ? l[h].max : "NULL");
                                break;
                            case "_min":
                                values.push(typeof l[h].min != "undefined" && !isNaN(l[h].min) ? l[h].min : "NULL");
                                break;
                            case "_median":
                                values.push(typeof l[h].median != "undefined" && !isNaN(l[h].median) ? l[h].median : "NULL");
                                break;
                            case "_q1":
                                values.push(typeof l[h].q1 != "undefined" && !isNaN(l[h].q1) ? l[h].q1 : "NULL");
                                break;
                            case "_q3":
                                values.push(typeof l[h].q3 != "undefined" && !isNaN(l[h].q3) ? l[h].q3 : "NULL");
                                break;
                            case "_avg":
                                values.push(typeof l[h].value != "undefined" && !isNaN(l[h].value) ? l[h].value : "NULL");
                                break;

                            default:
                                break;
                        }
                    }
                }
            }
            // while normally statements should be prepared, it's probably faster to just write this sql inject prone query
            var valueStr = "(" + values.join(",") + ")";

            let query = "INSERT INTO results " + headerStr + " VALUES " + valueStr;
            console.log("Running query " + query)
            db.exec(query);
        }, progress => {
            $("#sqlGenerateProgressBar .progress-bar").attr("aria-valuenow", Math.round(progress * 100));
            $("#sqlGenerateProgressBar .progress-bar").attr("style", "width: " + Math.round(progress * 100) + "%");
        }, () => {
            // done
            var binaryArray = db.export();
            var blob = new Blob([binaryArray], { type: "octet/stream" });

            var a = document.createElement("a");
            document.body.appendChild(a);
            var url = window.URL.createObjectURL(blob);
            a.href = url;
            (<any>a).download = "results.db";
            a.click();
            window.URL.revokeObjectURL(url);
        });

    }
});

function doFor<T>(arr: T[], func: (itm: T) => void, onProgress: (progress: number) => void, onDone: () => void) {
    let cur = 0;

    var f = () => {
        for (let i = 0; i < 10; i++) {

            if (cur >= arr.length) {
                onDone();
                return;
            }
            else {
                func(arr[cur]);
                cur++;
            }
        }
        onProgress(cur / arr.length);
        window.setTimeout(f, 1);
    };
    f();
}

$(document).ready(function () {
    $(".ddl").select2();

    initChart();
});

