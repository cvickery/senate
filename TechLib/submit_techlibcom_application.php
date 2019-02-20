<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
<html>
  <head>
    <title>Tech Fee Task Force Application</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style type="text/css" media="screen">
       body { font-family: sans-serif }
       p {margin-left: 2em;margin-right: 3em;}
       p.error {color: #ff0000;}
    </style>
  </head>
  <body bgcolor="#99ccff">
    <center>
    <h1>Technology Fee Task Force Application</h1>
    </center>
    <hr>
    
    <?php
    
      //  error_exit()
      //  -----------------------------------------------------------------
      function error_exit( $msg )
      {
        echo "<h2>Unable to Submit Application</h2>
                <p>Your application could not be submitted for the reason
                given below.</p>
                <p>Return to the application form, correct the
                error, and resubmit.</p>
                <p>There may be other errors in your application, but this
                is the first one we found.  For complete error checking on
                the application page itself, enable your browser's
                JavaScript feature.</p>
                <h3>Error:</h3>
                  <p class='error'>$msg</p>";
        exit();
      }
    
      //  Validate the form data in case JavaScript was disabled, and
      //  adjust values for inclusion in actual application.
      //  -----------------------------------------------------------------
      $name = array_key_exists("applicant", $_POST) ? $_POST["applicant"] : "";
      if ( strlen($name) == 0 )
        error_exit( "You didn't provide your name." );
    
      $category   = $_POST["category"];
      $ssNo       = array_key_exists("ssNo", $_POST) ? $_POST["ssNo"] : "";
      $gradDate   = array_key_exists("gradDate", $_POST) ? $_POST["gradDate"] : "";
    
      $department = "";
      if ( array_key_exists("departmentByDiv", $_POST) )
      {
        $department = $_POST["departmentByDiv"];
      }
      else if ( array_key_exists("departmentAlpha", $_POST) )
      {
        $department = $_POST["departmentAlpha"];
      }
      if ( strlen($department) == 0 )
        error_exit( "You did not specify your department or major." );
    
      //  Break department into division and department
      list( $div, $department ) = explode( ":", $department );
      $department = trim( $department );
      if ( strcmp( $department, "UNDECLARED" ) == 0 )
                                            $department = "Undeclared";
      
      //  Convert division abbreviation to division name.
      $division = "none";
      if ( strcmp($div, "ns") == 0 ) 
                         $division = "Mathematics and Natural Sciences";
      else if ( strcmp($div, "ss") == 0 )
                                          $division = "Social Sciences";
      else if ( strcmp($div, "ah") == 0 )
                                      $division = "Arts and Humanities";
      else if ( strcmp($div, "ed") == 0 )
                                                $division = "Education";
      $address    = $_POST["address"];
      if ( strlen($address) < 4 )
        error_exit( "You did not provide a valid campus or mailing address." );
      $city_state = array_key_exists("citystate", $_POST) ? $_POST["citystate"] : "";
      $zip_code   = array_key_exists("zipcode", $_POST) ? $_POST["zipcode"] : "";
    
      $phone      = $_POST["phone"];
      if ( strlen($phone) < 4 )
        err_exit( "You did not provide any telephone numbers." );
    
      $email_1    = $_POST["email_1"];
      $email_2    = $_POST["email_2"];
      if ( strlen($email_1) == 0 )
        error_exit( "Missing email address" );
      if ( strcmp( $email_1, $email_2 ) != 0 )
        error_exit( "Email addresses do not match." );
      if ( 0 == preg_match("/^\s*(\w+(\.\w+)*@(\w+\.)*qc\.cuny\.edu)\s*$/i", $email_1) )
        error_exit( $email_1." is not a valid QC email address." );
      $statement = $_POST["statement"];
      if ( strlen($statement) < 20 )
        error_exit( "You did not supply a statement of qualifications." );
    
      //  Get backslashes out of the text of the statements and "Women's"
      $department = str_replace( "\\", "", $department );
      $statement  = str_replace( "\\", "", $statement );
    
      $today = date( "F j, Y, g:i a" );
    
      $senate_email = "Eva.Fernandez@qc.cuny.edu";
      $subj         = "Tech Fee Task Force Application";
      $header       = "Return-Path: $senate_email\r\n";
      $header      .= "From: Senate Technology-Library Committee<$senate_email>\r\n";
      $header      .= "MIME-Version: 1.0\r\n";
      $header      .= "Content-Type: text/html; charset=utf-8;";
      $header      .= "\r\n\r\n";
      $msg = "
      <html><head><title>Tech Fee Task Force Application</title>
      <style>
        h1,h2 { font-size: large; }
        table { border: solid thin blue; }
        th,td { padding: 3px; }
      </style>
      </head>
      <body>
      <center>
      <h1>Technology Fee Task Force Application</h1>
      </center>
      <h2>Date: $today</h2>
      <h2>Applicant:</h2>
      <table style='padding: 5; font-size: larger;'>
      <tr><th align='right'>Name:<th align='left'> $name ($category)
          <tr><th align='right'>Division:<td> $division ($department)";
    
      if ( strcmp($category, "Faculty" ) != 0 )
      {
        $msg .=
        "<tr><th align='right'>ID No.:<td> $ssNo
         <tr><th align='right'>Graduation Date:<td> $gradDate
         <tr><th align='right'>Mailing Address:<td> $address
         <tr><th align='right'>&nbsp;<td> $city_state&nbsp;&nbsp;$zip_code";
      }
      else
      {
        $msg .=
        "<tr>
          <th align='right'>Campus Address:</th>
          <td> $address</td>
        </tr>";
      }
      $msg .= "
        <tr>
          <th align='right'>Telephone:</th>
          <td> $phone</td>
        </tr>
        <tr>
          <th align='right'>Email: </th>
          <td>$email_1</td>
        </tr>
      </table>";
      $msg .= "<h2>Statement:</h2>
        <p style='margin-left:2em; margin-right:10em;'>$statement</p>";
    
   
      $msg .= "<hr></body></html>";
      //  Send application to applicant first.
        if( ! mail( $email_1, "Copy of your $subj", $msg, $header ) )
        {
          echo ( "<p class='error'>
            There was an error emailing a copy of your application to you.</p>" );
          error_exit( "Is \"$email_1\" a valid QC email address?" );
        }
      //  If that worked, submit it to TechLib.
      if ( mail( $senate_email, $subj, $msg, $header ) == false)
        error_exit( "There was an error sending your application to the Technology/Library Committee." );

      //  Send a copy to me for verification.
      mail( "vickery@babbage.cs.qc.cuny.edu", "BCC Tech Fee Application", $msg, $header);
      //  And display confirmation.
      echo( "<h2>Thank You</h2>
                <p>Your application is being sent to the Senate&rsquo;s Technology
                and Library Committee for processing, and a copy is being sent to you at $email_1.</p>" );
 
    ?>
    
    <hr>
  </body>
</html>

