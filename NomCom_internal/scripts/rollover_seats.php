<?php
//  $Id: rollover_seats.php,v 1.3 2010/02/16 03:04:35 vickery Exp vickery $
//  -----------------------------------------------------------------------------------------------------------------
/*  Generates a new set of seats when a set of seats terms expire by copying the expiring seat info with the
 *  new expiration date equal to the current date plus the number of years per term for the committee given in
 *  the committees table. People who did not renew are dropped from their seats; others are carried forward.
 *  The new seats are marked current, and the old ones not-current.
 *
 *  C. Vickery
 *  December 2008
 *
 *  $Log: rollover_seats.php,v $
 *  Revision 1.3  2010/02/16 03:04:35  vickery
 *  Fixed grammar of the rollover report.
 *  Added both current date and election date to the
 *  report.
 *
 *  Revision 1.2  2009/12/31 22:17:39  vickery
 *  Reformatted report section to put each line in a paragraph instead
 *  of all lines in a pre.
 *  Email a copy of the report to vickery and D'Alessio.
 *  Updated database: added the reports table, with a trigger to check
 *  that the operator_id is for a db administrator.
 *
 *  Revision 1.1  2009/12/31 05:11:37  vickery
 *  Initial revision
 *
 *
 */
  session_start();

  //  Verify the user is logged in
  if ( !isset($_SESSION['person']) || ($_SESSION['person']['is_db_admin'] !== 't') || !isset($_POST['election-date']) )
  {
    die('Operation not authorized');
  }

  //  Get the election date to use for renewals
  $election_date = date_parse($_POST['election-date']) or die("Invalid election date");
  $election_date = "{$election_date['year']}-{$election_date['month']}-{$election_date['day']}";

  //  Get the date of the end of this month to use for expiration date
  function days_in_month($month) {
    $year = date('Y');
    $days = array(0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
    $days[2] = $days[2] + ((($year%4==0) && !($year%100)) || ($year%400==0)) ? 1 : 0;
    return $days[$month];
  }
  $this_month = date_parse(date('Y-m-j'));
  $this_month['day'] = days_in_month($this_month['month']);
  $this_month = "{$this_month['year']}-{$this_month['month']}-{$this_month['day']}";

  //  Connect to the database
  require_once("credentials.php");

  //  Wrap this process in a transaction in case anything goes wrong
  pg_query($senate_db, "BEGIN");

  //  Get a list of all expired seats
  $query =  "SELECT "
          //  seats columns
        . " seats.id as seat_id, "
        . " committee_id, division_id, is_faculty_seat, is_undergraduate_student_seat, "
        . " is_graduate_student_seat, is_evening_student_seat, "
        . " person_id, expiration_date, election_date, is_current, renewal_received, "
        . " is_instructional_faculty_seat, "
        . " pro_tem_person_id, pro_tem_expiration_date, pro_tem_election_date, "
          //  people columns
        . " first_name, last_name, "
          //  committees columns
        . "name, abbreviation, chair_id, years_per_term "
        . "FROM seats, people, committees "
        . "WHERE "
        . "     is_current "
        . "  AND "
        . "     committees.id = committee_id "
        . "  AND "
        . "     people.id = person_id "
        . "  AND "
        . "  expiration_date <= '{$this_month}'";
  $result = pg_query($senate_db, $query);

  //  For each expiring seat, create a new seat with the new expiration date equal to the current
  //  expiration date plus the number of years given by the years_per_term column of the corresponding
  //  committee in the committees table.

  $num_seats = pg_num_rows($result);
  if ($num_seats === 1)
  {
    $copula = 'was';
    $suffix = '';
  }
  else
  {
    $copula = 'were';
    $suffix = 's';
  }
  $report_date = date_create();
  $report_date_str = $report_date->format('F j, Y');
  $effective_date = date_create($_POST['election-date']);
  $effective_date_str = $effective_date->format('F j, Y');
  $report =   "<h2>Results</h2><p>\n"
          .   "On $report_date_str, $num_seats seat$suffix $copula rolled over, effective $effective_date_str.</p>\n"
          .   "<h3>Renewals:</h3>\n";
  while ($row = pg_fetch_assoc($result))
  {
    //  Change expired seats to OPEN (person_id == 1)
    if ( $row['renewal_received'] !== 't' )
    {
      if ($row['person_id'] !== '1')
      {
        if ($row['person_id'] === $row['chair_id'])
        {
          $report .= "<p>{$row['first_name']} {$row['last_name']}, <strong>chair of {$row['name']} did not renew.</strong></p>\n";
          pg_query($senate_db, "UPDATE committees SET chair_id = NULL WHERE id = {$row['committee_id']}");
        }
        else
        {
          $report .= "<p>{$row['first_name']} {$row['last_name']}, member of {$row['name']} did not renew.</p>\n";
        }
      }
      $row['person_id'] = 1;
    }
    else
    {
      if ($row['person_id'] === $row['chair_id'])
      {
        $report .= "<p>{$row['first_name']} {$row['last_name']}, <strong>chair</strong> of {$row['abbreviation']} did renew.</p>\n";
      }
      else
      {
        $report .= "<p>{$row['first_name']} {$row['last_name']}, member of {$row['abbreviation']} did renew.</p>\n";
      }
    }
    //  Deactivate the old seat.
    pg_query($senate_db, "UPDATE seats SET is_current = 'f' WHERE id = {$row['seat_id']}");

    //  Eliminate pro-tem information if it has expired
    /*  Note: update_seat.php has already checked that pro tem seats do not have expiration dates
     *  beyond their seat's expiration date.
     */
    $pro_tem_columns =  " pro_tem_person_id, pro_tem_expiration_date, pro_tem_election_date, ";
    $pro_tem_values =   " {$row['pro_tem_person_id']}, '{$row['pro_tem_expiration_date']}', '{$row['pro_tem_election_date']}', ";
    if ( is_null($row['pro_tem_person_id']) || ($row['pro_tem_expiration_date'] <= $this_month) )
    {
      $pro_tem_columns = "";
      $pro_tem_values = "";
    }
    //  Create the new seat.
    $query = "INSERT INTO seats ("
      . " committee_id, "
      . " division_id, "
      . " is_faculty_seat, "
      . " is_instructional_faculty_seat, "
      . " is_undergraduate_student_seat, "
      . " is_graduate_student_seat, "
      . " is_evening_student_seat, "
      . " person_id, "
      . " expiration_date, "
      . $pro_tem_columns
      . " election_date )"
      . "  VALUES ( "
      . " {$row['committee_id']}, "
      . " {$row['division_id']}, "
      . " '{$row['is_faculty_seat']}', "
      . " '{$row['is_instructional_faculty_seat']}', "
      . " '{$row['is_undergraduate_student_seat']}', "
      . " '{$row['is_graduate_student_seat']}', "
      . " '{$row['is_evening_student_seat']}', "
      . "  {$row['person_id']}, "
      . " '{$row['expiration_date']}'::DATE + INTERVAL '{$row['years_per_term']} years', "
      . $pro_tem_values
      . " '$election_date'::DATE )";
    //echo "$query\n";
    $insert = pg_query($senate_db, $query);
    continue;
  }

  //  Add a report record telling what we have done.
  $query =  "INSERT INTO reports (id, timestamp, operator_id, report_type, report_content) "
          . " VALUES ("
          . " DEFAULT, "                    //  id
          . " now(),"                       //  timestamp
          . " {$_SESSION['person']['id']}," //  operator_id
          . " 'rollover', "                 //  report_type
          . " '{$report}' "                 //  report_content
          . ")";
  pg_query($senate_db, $query);

  //  Complete the rollover process
  pg_query($senate_db, "COMMIT");
  pg_close($senate_db);
  echo $report;
  $email_recipients = "vickery@babbage.cs.qc.cuny.edu, Phyllis.DAlessio@qc.cuny.edu";
  $email_message = "<html><body>$report</body></html>";
  $email_subject = "Committee Seats Rollover Report";
  $email_headers =  "From: Senate Nominating Committee<vickery@babbage.cs.qc.cuny.edu>\r\n"
                  . "Content-Type: text/html; charset=utf-8;\r\nMIME-Version: 1.0";
  if (!mail($email_recipients, $email_subject, $email_message, $email_headers))
  {
    echo "<p class='error-msg'>Error sending email copies of report.</p>\n";
  }
?>

