// $Id: application-archive.js,v 1.3 2010/01/16 18:29:01 vickery Exp vickery $
/*  Browse the archive of appliations by name or date.
 *
 *    $Log: application-archive.js,v $
 *    Revision 1.3  2010/01/16 18:29:01  vickery
 *    Keyboard browsing seems to work across platforms now: keyup listener for
 *    the document.documentElement element was suggested by someone in a JQuery
 *    blog who was trying to accomplish the same thing.
 *    Fixed up some missing focus() calls and switched browsing mode heading
 *    text when browsing mode switches.
 *    Deleted some comments left over from development process.
 *
 *    Revision 1.2  2010/01/15 06:12:57  vickery
 *    Switched from using an object with data attribute to a div with
 *    AJAX/innerHTML to display the applications to accommodate IE and
 *    Webkit.
 *    Considerable code cleanup and refactoring, but keyboard navigation
 *    is still not working.
 *
 *    Revision 1.1  2010/01/14 06:14:16  vickery
 *    Initial revision
 *
 */
if (typeof Core !== 'object')
{
  alert ("Core Library missing.");
}
else
{
  Core.start(
  (function()
    {
      //  Global Variables
      //  ----------------------------------------------------------------------------------------
      var searchText          = null;
      var applicationPanel    = null;
      var selectedNameElement = null;
      var selectedDateElement = null;
      var browsingByDate      = null;
      var date_links          = null;
      var name_links          = null;

      var requestObject       = null;

      //  newRequestObject()
      //  -----------------------------------------------------------------------------------------
      /*  Creates a new requestObject, if possible.
       */
        function newRequestObject()
        {
          try
          {
            requestObject = new XMLHttpRequest();
          }
          catch (error)
          {
            requestObject = new ActiveXObject('Microsoft.XMLHTTP');
          }
        }

      //  requestHandler()
      //  -----------------------------------------------------------------------------------------
      /*  Handles loading applications into the application element.
       */
        function requestHandler()
        {
          if (requestObject.readyState === 4)
          {
            var inner = /<body>(.*)<\/body>/.exec(requestObject.responseText.replace(/\n/g, ' '))[1];
            applicationPanel.innerHTML = inner;
          }
        }
      //  clickListener()
      //  -----------------------------------------------------------------------------------------
      /*  Load the selected application when the link is clicked.
       */
        function clickListener(evt)
        {
          evt = evt ? evt : window.event;
          if (browsingByDate)
          {
            Core.removeClass(date_links[selectedDateElement.index].parentNode, 'selected');
            selectedDateElement = this;
            selectedDateElement.focus();
            Core.addClass(date_links[selectedDateElement.index].parentNode, 'selected');
          }
          else
          {
            Core.removeClass(name_links[selectedNameElement.index].parentNode, 'selected');
            selectedNameElement = this;
            selectedNameElement.focus();
            Core.addClass(name_links[selectedNameElement.index].parentNode, 'selected');
          }
          newRequestObject();
          requestObject.onreadystatechange = requestHandler;
          requestObject.open('GET', this.href, true);
          requestObject.send(null);
          Core.preventDefault(evt);
        }

      //  keyupListener()
      //  -----------------------------------------------------------------------------------------
      /*    Arrow keys move up and down the current browsing list.
       */
        function keyupListener(evt)
        {
          evt = evt ? evt : window.event;
          switch (evt.keyCode)
          {
            case 13:  // CR
            {
              var href = (browsingByDate) ? selectedDateElement.href : selectedNameElement.href;
              newRequestObject();
              requestObject.onreadystatechange = requestHandler;
              requestObject.open('GET', href, true);
              requestObject.send(null);
              break;
            }

            case 38:  // Up
            {
              if (browsingByDate)
              {
                if ( selectedDateElement.index > 0)
                {
                  Core.removeClass(selectedDateElement.parentNode, 'selected');
                  selectedDateElement = date_links[selectedDateElement.index - 1];
                  Core.addClass(selectedDateElement.parentNode, 'selected');
                  selectedDateElement.scrollIntoView();
                  selectedDateElement.focus();
                }
              }
              else
              {
                if ( selectedNameElement.index > 0)
                {
                  Core.removeClass(selectedNameElement.parentNode, 'selected');
                  selectedNameElement = name_links[selectedNameElement.index -1];
                  Core.addClass(selectedNameElement.parentNode, 'selected');
                  selectedNameElement.scrollIntoView();
                  selectedNameElement.focus();
                }
              }
              Core.preventDefault(evt);
              break;
            }

            case 40:  // Dn
            {
              if (browsingByDate)
              {
                if ( selectedDateElement.index < date_links.length - 1)
                {
                  Core.removeClass(selectedDateElement.parentNode, 'selected');
                  selectedDateElement = date_links[selectedDateElement.index + 1];
                  Core.addClass(selectedDateElement.parentNode, 'selected');
                  selectedDateElement.scrollIntoView();
                  selectedDateElement.focus();
                }
              }
              else
              {
                if ( selectedNameElement.index < name_links.length - 1)
                {
                  Core.removeClass(selectedNameElement.parentNode, 'selected');
                  selectedNameElement = name_links[selectedNameElement.index + 1];
                  Core.addClass(selectedNameElement.parentNode, 'selected');
                  selectedNameElement.scrollIntoView();
                  selectedNameElement.focus();
                }
              }
              Core.preventDefault(evt);
              break;
            }

            default:
            {
              break;
            }
          }
        }
      //  return {init: function() ...};
      //  -----------------------------------------------------------------------------------------
      return {
        init: function()
        {
          var windowHeight = document.documentElement.clientHeight || document.body.clientHeight;
          var contentDiv = document.getElementById('content');
          /*  Resize the content div, the application panel, and the two browsing divs to        *
           *  fill the space available on the user’s screen.                                     *
           *    offsetHeight: total width of an element including scrollbars and borders         *
           *    clientHeight: CSS width + padding                                                */
          var padding = 32; // 2 × 1em assuming font-size is 16px
          var extra = contentDiv.offsetHeight - contentDiv.clientHeight + padding;
          contentDiv.style.height = (windowHeight - contentDiv.offsetTop - extra) + 'px';
          applicationPanel = document.getElementById('application');
          applicationPanel.style.height = (contentDiv.offsetHeight - extra) + 'px';
          var browseByDateDiv     = document.getElementById('browse-by-date');
          var browseByNameDiv     = document.getElementById('browse-by-name');

          browseByNameDiv.style.height = browseByDateDiv.style.height = (contentDiv.offsetHeight -  extra -
              46) + "px";
          browseByDateDiv.style.display = browseByNameDiv.style.display = 'none';
          var browseByButton  = document.getElementById('browse-by-button');
          var browseByHeading = browseByButton.parentNode.getElementsByTagName('h2')[0];
          Core.addEventListener(browseByButton, 'click', function()
              {
                if (browsingByDate)
                {
                  browseByDateDiv.style.display = 'none';
                  browseByNameDiv.style.display = 'block';
                  browsingByDate                = false;
                  browseByHeading.firstChild.nodeValue = 'Browse By Name';
                  browseByButton.firstChild.nodeValue = 'Switch to browse by date';
                  selectedNameElement.focus();
                }
                else
                {
                  browseByDateDiv.style.display = 'block';
                  browseByNameDiv.style.display = 'none';
                  browsingByDate                = true;
                  browseByHeading.firstChild.nodeValue = 'Browse By Date';
                  browseByButton.firstChild.nodeValue = 'Switch to browse by name';
                  selectedDateElement.focus();
                }
              });

          name_links = browseByNameDiv.getElementsByTagName('a');
          for (var i = 0; i < name_links.length; i++)
          {
            name_links[i].index = i;
            Core.addEventListener(name_links[i], 'click', clickListener);
          }
          selectedNameElement = name_links[0];
          Core.addClass(selectedNameElement.parentNode, 'selected');

          date_links = browseByDateDiv.getElementsByTagName('a');
          for (var i = 0; i < date_links.length; i++)
          {
            date_links[i].index = i;
            Core.addEventListener(date_links[i], 'click', clickListener);
          }
          selectedDateElement = date_links[0];
          Core.addClass(selectedDateElement.parentNode, 'selected');

          //  Using document.documentElement was suggested by a jquery blog entry.
          //  And it seems to work across browsers.
          Core.addEventListener(document.documentElement, 'keyup', keyupListener);

          //  Initial setup: browse by date
          browseByDateDiv.style.display = 'block';
          browseByNameDiv.style.display = 'none';
          browsingByDate                = true;
          browseByButton.nodeValue      = 'Switch to browse by name';
          selectedDateElement.focus();
        }
      };
    })()
  );
}
