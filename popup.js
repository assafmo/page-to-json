function donwloadFile(content, name) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', name);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element)
}

function rowToJson(row, headerNames) {
  var json = {};

  $(row).find('td').each(function (index) {
    var value = $(this).text()
      .split('\n')
      .map(function (text) {
        return text.trim();
      })
      .filter(function (text) {
        return text;
      });

    if (value.length <= 1)
      value = value[0];

    json[headerNames[index]] = value;
  });

  return json;
}

function htmlToJson(html, url) {
  var $$ = $(html);
  var json = {};

  json.tables = [];

  $$.find('table').each(function () {
    const table = [];

    var rows = $(this).find('tr');
    if (!rows.length)
      return;

    var firstRow = $(rows[0]);
    if (firstRow.find('th').length && firstRow.find('td').length) {
      //key-value table
      rows.each(function () {
        var row = {};

        row[$(this).find('th').text().trim()] = $(this).find('td').text().trim();

        table.push(row);
      });
    }
    else if (!firstRow.children().length != $(rows[1]).children().length) {
      //some misguided person went bananas
      rows.each(function () {
        var row = [];

        $(this).children().each(function (index) {
          var value = $(this).text()
            .split('\n')
            .map(function (text) {
              return text.trim();
            })
            .filter(function (text) {
              return text;
            });

          if (value.length <= 1)
            value = value[0];

          row.push(value);
        });

        table.push(row);
      });
    }
    else if (!firstRow.find('th').length && firstRow.find('td').length) {
      //some misguided person used td as header+data
      var headerNames = [];
      firstRow.find('td').each(function () {
        headerNames.push($(this).text().trim());
      });

      rows.slice(1).each(function () {
        table.push(rowToJson(this, headerNames));
      });
    }
    else {
      //normal table
      var headerNames = [];
      firstRow.find('th').each(function () {
        headerNames.push($(this).text().trim());
      });

      rows.slice(1).each(function () {
        table.push(rowToJson(this, headerNames));
      });
    }

    json.tables.push(table);
  });

  json.lists = [];

  $$.find('ul').each(function () {
    const list = [];

    $(this).find('li').each(function (i, e) {
      //remove the inner ul
      //the inner li will be part of this ul and part of their own ul            
      $(this).find('ul').remove();

      const value = $(this).text().trim();
      if (value)
        list.push(value);
    });

    json.lists.push(list);
  });

  json.links = [];

  $$.find('a').each(function (i, e) {
    let link = $(this).attr('href');
    link = link && link.trim();

    if (!link)
      return;
    if (link.startsWith('#'))
      return;
    if (link.startsWith('/'))
      link = (url.match(/.+?\/.+?\//)[0] + link).replace(/\/\//g, '/');
    else
      link = (url.match(/.+?\/.+?\//)[0] + '/' + link).replace(/\/\//g, '/');

    json.links.push(link);
  });

  return json;
}

chrome.runtime.onMessage.addListener(function (request, sender) {
  if (request.action == 'getSource') {
    var json = htmlToJson(request.source, request.url);
    donwloadFile(JSON.stringify(json, null, 2), 'banana.json')
  }
});

window.onload = function onWindowLoad() {
  chrome.tabs.executeScript(null, {
    code: 'chrome.runtime.sendMessage({ \
      action: "getSource", \
      url: window.location.href, \
      source: document.documentElement.outerHTML\
    });'
  });
};