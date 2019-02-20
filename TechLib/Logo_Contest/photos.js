//  photos.js
/*
 *  Javascript support routines for the photo gallery web page.
 */

//  Globals
//  -----------------------------------------------------------------
  var initialized   = false;
  var currentImage  = 0;
  var imgHeight     = 100;
  var images        = new Array();
  var useSmaller    = true;

  //  Labels for resolution button
  var lowResLabel =
            "Use High Resolution (Slower Download)";
  var hiResLabel =
            "Use Low Resolution (Faster Download)";

  //  setInner()
  //  --------------------------------------------------------------
  /*    Generate the correct innerHTML for an element, depending on
   *    which browser.
   */
    function setInner( idString, htmlString )
    {
      if ( document.all )
      {
        document.all[ idString ].innerHTML = htmlString;
      }
      else
      {
        document.getElementById( idString ).innerHTML = htmlString;
      }
    }

    function waitForCurrent()
    {
      //  TODO: Get this to work.
      return;
    }

  //  showImage()
  //  ----------------------------------------------------------------
  /*  Displays an image in the image table.  Waits until the image has
   *  been loaded if necessary.
   */
  function showImage( im )
  {
    var fileName = imageURLs[im].split("/")[2];
    window.scrollTo(0, 0);
    currentImage = im;

    if ( !images[im]  )
    {
      images[im] = new Image();
    }

    if ( useSmaller )
    {
      images[im].src = smallerURLs[im];
    }
    else
    {
      images[im].src = imageURLs[im];
    }
    setInner( "image", "<h3>Waiting for image ...<\/h3>" );
    waitForCurrent();

    setInner( "image", "<img class=\"main_image\""  +
                  "src=\""+images[im].src            +
                  "\" "                             +
                  "alt=\""+imageURLs[im]            +
                  "\" height=\""+imgHeight+"\" />" );
    setInner( "title", fileName );
  }

  //  toggleResolution()
  //  -----------------------------------------------------------------
  /*    Toggle between jpeg qualities
   */
    function toggleResolution()
    {
      useSmaller = !useSmaller;
      showImage( currentImage );
      setInner( "resolution", useSmaller ? lowResLabel : hiResLabel );
    }


  //  showNext()
  //  -----------------------------------------------------------------
  function showNext()
  {
    if ( currentImage < (imageURLs.length - 1) )
    {
      showImage( currentImage + 1 );
    }
  }
  
  //  showPrev()
  //  -----------------------------------------------------------------
  function showPrev()
  {
    if ( currentImage > 0 )
    {
      showImage( currentImage - 1 );
    }
    else
    {
      showImage( 0 );
    }
  }

  //  biggerfy() and smallerfy()
  //  ----------------------------------------------------------------
  /*
   *    Make images bigger or smaller to fit user's screen
   */
    function biggerfy()
    {
      var newHeight = imgHeight * 1.1;
      imgHeight = (newHeight > 1800) ? 1800 : newHeight;
      showImage( currentImage );
    }
    function smallerfy()
    {
      var newHeight = imgHeight * 0.9;
      imgHeight = (newHeight < 50) ? 50 : newHeight;
      showImage( currentImage );
    }


  //  showFirst() and showLast()
  //  ----------------------------------------------------------------
  function showFirst()
  {
    if ( !initialized )
    {
      initialize();
    }
    if (imageURLs.length != 0)
    {
      showImage( 0 );
    }
  }

  function showLast()
  {
    if (imageURLs.length != 0)
    {
      showImage( imageURLs.length - 1 );
    }
  }

