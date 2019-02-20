<?php
  if (stristr($_SERVER["HTTP_ACCEPT"], "application/xhtml+xml"))
  {
    header("Content-type: application/xhtml+xml");
    print("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
  }
  else
  {
    header("Content-type: text/html; charset=utf-8");
  }
 ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"
  "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head><title>Technology and Library Committee Pending Reports</title>
<link rel="stylesheet" type="text/css" href="../../../../TechLib/Reports/style-all.css" />
<link rel="stylesheet"
      type="text/css"
      href="../../../../TechLib/Reports/style-screen.css"
      media="screen" />
</head>
<?php
  $months = array("01" => "January",
                  "02" => "February",
                  "03" => "March",
                  "04" => "April",
                  "05" => "May",
                  "06" => "June",
                  "07" => "July",
                  "08" => "August",
                  "09" => "September",
                  "10" => "October",
                  "11" => "November",
                  "12" => "December");
  $current_year = "";
  //  php generate_link()
  //  -------------------------------------------------------
  /*  Generate date text from a file name in the form
   *  yyyy-mm-dd.pdf.  Also generates headers for years.
   */
  function generate_link(&$value, $key)
  {
    GLOBAL $months, $current_year;
    $parts = explode("-", $value);
    $day_ext = explode(".", $parts[2]);
    $day = $day_ext[0];
    $month = $months[$parts[1]];
    $year = $parts[0];
    echo "<p class=\"indent\"><a href=\"$value\">".$month." ".$day
                                      .", ".$year."</a></p>\n";
  }
 ?>
<body>
<div id="header">
  <div id="header-logo">
    <img src="../../../../TechLib/Reports/TechLib-200x91-JG.jpg" alt="" />
  </div>
  <div id="header-text">
    <p><strong>Pending Reports</strong></p>
    <p><em>Technology and Library Committee</em></p>
    <p><em>Queens College of CUNY</em></p>
  </div>
</div>

<div id="body">
  <div class="whitebox">

    <p>This is a list of reports to be submitted by the Technology and
    Library Committee to the Queens College Academic Senate.  Reports
    listed here have not been approved by the committee yet, and
    should be considered <strong>DRAFT</strong> copies.</p>

    <p>All documents are in PDF format.</p>

      <?php
        $i = 0;
        $dir = opendir(".");

        while ($file = readdir($dir))
        {
          //  Make script break in 2500 AD
          if (preg_match("/[1-2][0-4][0-9][[0-9]-[01][0-9]-[0-3][0-9].*(html|pdf)$/i", $file))
          {
            $files[$i++] = $file;
          }
        }
        rsort($files);
        if ($i == 0)
        {
          echo "<h2>There are no reports in the archive</h2>";
        }
        else
        {
          reset($files);
          array_walk($files, "generate_link");
        }
       ?>
  </div>

  <hr />
  <div id="footer">
    <a href="../../../../TechLib/Reports">TechLib Home Page</a>&nbsp;-
    <a href="http://validator.w3.org/check?uri=referer">
      XHTML</a>&nbsp;
    <a href="http://jigsaw.w3.org/css-validator/check/referer">
      CSS</a>
  </div>
</div>

</body></html>

