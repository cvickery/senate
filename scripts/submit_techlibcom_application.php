#!/usr/local/bin/php
<html><head><title>Tech Fee Task Force Application</title>
<style type="text/css" media="screen">
   body { font-family: sans-serif }
   p {margin-left: 2em;margin-right: 3em;}
   p.error {color: #ff0000;}
</style>
</head><body bgcolor="#99ccff">
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
  $name = $_POST["applicant"];
  if ( strlen($name) == 0 )
    error_exit( "You didn't provide your name." );

  $category   = $_POST["category"];
  $ssNo       = $_POST["ssNo"];
  $gradDate   = $_POST["gradDate"];

  $department = $_POST["departmentByDiv"];
  if ( strlen($department) == 0 )
  {
    $department = $_POST["departmentAlpha"];
  }
  if ( strlen($department) == 0 )
    error_exit( "You didn't specify your department or major." );

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
  $city_state = $_POST["citystate"];
  $zip_code   = $_POST["zipcode"];

  $phone      = $_POST["phone"];
  if ( strlen($phone) < 4 )
    err_exit( "You did not provide any telephone numbers." );

  $email_1    = $_POST["email_1"];
  $email_2    = $_POST["email_2"];
  if ( strcmp( $email_1, $email_2 ) != 0 )
    error_exit( "Email addresses do not match." );
  if ( strlen($email_1) == 0 )
    $email = "(none)";
  else
    $email = $email_1;

  $renewTechFee = $_POST["renewTechFee"];
  $statement = $_POST["statement"];
  if ( strlen($statement) < 20 )
    error_exit( "You did not supply a statement of qualifications." );

  $additional = $_POST["additional"];

  if (  (strlen($additional) == 0) && (
        (strcmp($firstOther,  "A Search or Review Committee") == 0) ||
        (strcmp($secondOther, "A Search or Review Committee") == 0) ||
        (strcmp($thirdOther,  "A Search or Review Committee") == 0) ))
    error_exit( "You didn't tell which search or review committee." );

  //  Get backslashes out of the text of the statements and "Women's"
  $department = str_replace( "\\", "", $department );
  $statement  = str_replace( "\\", "", $statement );
  $additional = str_replace( "\\", "", $additional );

  $today = date( "F j, Y, g:i a" );

  $senate_email = "techlib@qc.edu";
  $subj         = "Tech Fee Task Force Application";
  $header       = "Return-Path: $senate_email\r\n";
  $header      .= "From: Senate Technology-Library Committee<$senate_email>\r\n";
  $header      .= "MIME-Version: 1.0\r\n";
  $header      .= "Content-Type: text/html; charset=iso-8859-1;";
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
     <tr><th align='right'>&nbsp;<td> $city_state
                                              &nbsp;&nbsp;$zip_code";
  }
  else
  {
    $msg .=
    "<tr><th align='right'>Campus Address:<td> $address";
  }
  $msg .= "
  <tr><th align='right'>Telephone:<td> $phone
  <tr><th align='right'>Email:<td> $email
  </table>";
    if ( strcmp($renewTechFee, "on") == 0 )
    {
      $msg .= "<p style='margin-left: 1em`'>
                <b>*** This is a renewal.</b></p>";
    }
  $msg .= "<h2>Statement:</h2>
    <p style='margin-left:2em; margin-right:10em;'>$statement</p>";

  if ( strlen($additional) != 0 )
  {
    $msg .= "<h2>Additional Comments:</h2>
             <p style='margin-left:2em; margin-right:10em;'>
                                                      $additional</p>";
  }

  $msg .= "<hr></body></html>";

  //  Send application to applicant first.
  if ( strcmp($email, "(none)") != 0 )
  {
    $tmp = "Copy of your ";
    $tmp .= $subj;
    if( ! mail( $email_1, $tmp, $msg, $header ) )
    {
      echo ( "<p class='error'>
             There was an error emailing a copy of your application to
                                                           you.</p>" );
      error_exit( "Is \"$email_1\" a valid email address?" );
    }
  }

  //  If that worked, submit it to TechLib.
  if( mail( $senate_email, $subj, $msg, $header ) == false )
    error_exit(
"There was an error sending your application to the Technology/Library Committee." );

  //  Temporary: send a copy to vickery during initial evaluation
  //  phase.
  mail( "vickery@babbage.cs.qc.edu", "BCC Tech Fee Application",
        $msg, $header);

  //  And display confirmation.
  echo( "<h2>Thank You</h2>
            <p>Your application is being sent to the Senate's Technology
            and Library Committee for processing" );
            
  if ( strlen($email_1) == 0 )
  {
    echo( ".<p>You did not supply an email address, so we are unable to
          send a confirmation copy of your application to you.
          If you would like to provide an address at a later time,
          please complete another application, include your email
          address, and note that you are submitting an \"updated
          application\" in the Additional Comments section.</p>" );
  }
  else
  {
    echo( ", and a copy is being emailed to the address you supplied
          on the application form.</p>" );
  }

?>

<hr></body></html>

