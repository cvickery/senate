<?php
//  $Id: manage_seats.php,v 1.9 2010/08/30 05:35:20 vickery Exp vickery $

/*  This module creates arrays of CommitteeSeat objects, one for
 *  students and one for faculty. All seats on all committees are
 *  included. Two functions iterate over these arrays and generate table
 *  rows with info about the seats. Classes are added to the data cells
 *  for the seat holder where the holder is the chair and/or the seat is
 *  expiring this year. Seats are listed in committee id order, which is
 *  presumably alphabetical. On the assumption that OPEN seats have a
 *  people.id of 1, open seats are listed after seats held by people.
 *
 *  C. Vickery
 *  October 2008
 *
 *    $Log: manage_seats.php,v $
 *    Revision 1.9  2010/08/30 05:35:20  vickery
 *    Added support for resignation of either the regular or pro-tem
 *    seat holder when a seat has a pro-tem seat holder.
 *
 *    Revision 1.8  2010/01/09 22:54:18  vickery
 *    Handle expired pro tempore seat holders (do not display them).
 *
 *    Revision 1.7  2010/01/08 06:12:02  vickery
 *    Remove chair status and update committees table when the
 *    chair of a committee vacates a seat.
 *
 *    Revision 1.6  2009/12/31 05:14:28  vickery
 *    Bug fix: latest renewal was not being reported correctly.
 *
 *    Revision 1.5  2009/12/29 05:24:26  vickery
 *    Whitespace and bug fixes.
 *    Restrict administrative access to administrators.
 *
 *    Revision 1.4  2009/11/09 06:17:20  vickery
 *    Numerous changes accompanying the change to make this
 *    application look like committee_seats. Added the
 *    expiration-date class value to cells in that column.
 *
 *    Revision 1.3  2009/11/08 04:14:53  vickery
 *    Removed all references to the renewal_not_required column of the seats
 *    table in the senate database ... because the column was deleted from
 *    the table.
 *
 *    Revision 1.2  2009/11/02 00:40:06  vickery
 *    Updated title string for seats to show date of vacancy as well
 *    as election or pro tem info.
 *
 *    Revision 1.1  2009/11/01 04:47:46  vickery
 *    Initial revision
 *
 */

//  class HTML_Attribute
//  ------------------------------------------------------------------------------------------------------------------------------
/*  Lets you add words to a string only if they are not already there.
 */
class HTML_Attribute
{
  private $values;
  private $name;
  public function __construct($name)
  {
    $this->name = $name;
    $this->values = '';
  }
  public function addValue($value)
  {
    if ($this->values === '')
    {
      $this->values = $value;
      return;
    }
    if (preg_match("/".$value."/",$this->values)) return;
      $this->values .= " ".$value;
  }
  public function __toString()
  {
    if ($this->values === '') return '';
    return " ".$this->name."=\"".$this->values."\"";
  }
}


//  class CommitteeSeat
//  --------------------------------------------------------------------------------------------------------------------------------
/*  Holds the information from the database for one row of the seats table. The constructor generates a committeeType
 *  string based on the is_standing, is_special, is_college, and is_subcommittee booleans of the committees table for
 *  the seat.
 */
class CommitteeSeat
{
  public $seat_id, $committee_id, $person_id, $committee_name, $divisionRequirement,
         $electionDate, $expirationDate, $renewalReceived,
         $isFaculty, $isInstructionalFaculty, $isUndergraduate, $isGraduate, $isEvening,
         $person_name, $pro_tem_person_id, $pro_tem_person_name, $pro_tem_expiration_date, $isChair, $committee_type;
  public function __construct($seat_id, $committee_id, $person_id, $committee_name, $divisionRequirement,
                              $electionDate, $expirationDate, $renewalReceived,
                              $isFaculty, $isInstructionalFaculty, $isUndergraduate, $isGraduate, $isEvening,
                              $person_name, $pro_tem_person_id, $pro_tem_person_name, $pro_tem_expiration_date, $chair,
                              $is_subcommittee, $is_college, $is_special, $is_standing)
  {
    $this->seat_id = str_pad($seat_id, 5, '0', STR_PAD_LEFT);
    $this->committee_id = $committee_id;
    $this->person_id = $person_id;
    $this->committee_name = $committee_name;
    $this->divisionRequirement = $divisionRequirement;
    $this->isFaculty = $isFaculty == 't';
    $this->isInstructionalFaculty = $isInstructionalFaculty == 't';
    $this->isUndergraduate = $isUndergraduate == 't';
    $this->isGraduate = $isGraduate == 't';
    $this->isEvening = $isEvening == 't';
    $this->electionDate = new DateTime($electionDate);
    $this->expirationDate = new DateTime($expirationDate);
    $this->person_name = $person_name;
    $this->pro_tem_person_id = $pro_tem_person_id;
    $this->pro_tem_person_name = $pro_tem_person_name;
    $this->pro_tem_expiration_date = new DateTime($pro_tem_expiration_date);
    $this->isChair = $chair == 't';
    $this->renewalReceived = $renewalReceived == 't';

    if ($is_subcommittee == 't')  $this->committee_type = "Subcommittees";
    if ($is_college == 't')       $this->committee_type = "College Committees";
    if ($is_special == 't')       $this->committee_type = "Special Committees";
    if ($is_standing == 't')      $this->committee_type = "Standing Committees";

  }
};

//  Global Variables
//  -----------------------------------------------------------------------------------------------------------------
$faculty_seats = array();
$student_seats = array();
$thisCommittee = 0;
$thisCommitteeType = "";

$lastElection = 'last Senate election date unknown';
$conn = pg_connect("dbname=senate user=web_user password=web_user");
$result = pg_query($conn, 'SELECT max(election_date) AS "last_election", max(modified) AS "last_modified" FROM seats');
$row = pg_fetch_assoc($result);
$lastElection = new DateTime($row['last_election']);
$lastElection = $lastElection->format('F j, Y');
$lastModifiedDate = new DateTime($row['last_modified']);
$lastModified = $lastModifiedDate->format('F j, Y \a\t g:m a');
$lastRenewal = "None";
$result = pg_query($conn, 'SELECT max(modified) as "latest_renewal" FROM seats WHERE renewal_received AND is_current');
$row = pg_fetch_assoc($result);
if ($row['latest_renewal'])
{
  $lastRenewal = new DateTime($row['latest_renewal']);
  $lastRenewal = $lastRenewal->format('F j, Y');
}
$today = new DateTime();
$todayPlusThreeMonths = new DateTime();
$todayPlusThreeMonths->modify('3 months');
pg_free_result($result);


//  Get the information for all the currently-active committees' seats. Exclude expired seats.
$query = <<<EOT
  SELECT seats.id as "seat_id", committee_id, person_id, committees.name as committee_name, divisions.abbreviation,
  election_date, expiration_date, is_faculty_seat,
  is_instructional_faculty_seat, is_undergraduate_student_seat, is_graduate_student_seat, is_evening_student_seat, 
  first_name, last_name,
  chair_id = person_id  as is_chair, renewal_received, is_subcommittee, is_college, is_special, is_standing,
  pro_tem_person_id, pro_tem_election_date, pro_tem_expiration_date
  FROM committees, divisions, seats, people
  WHERE
      committees.is_active
    AND
      committees.id = seats.committee_id
    AND
      divisions.id = seats.division_id
    AND
      people.id = seats.person_id
    AND
      seats.is_current
  ORDER BY
      is_subcommittee, is_college, is_special, is_standing, committees.name, expiration_date, divisions.id, last_name
EOT;
$result = pg_query($conn, $query) or die("All seats query failed: ".pg_last_error($conn));

//  Initialize student and faculty seat arrays
//  -----------------------------------------------------------------------------------------------------------------
while ($row = pg_fetch_assoc($result))
{
  $pro_tem_person_id = null;
  $pro_tem_person_name = '';
  $pro_tem_expiration_date = $row['pro_tem_expiration_date'];
  if ( ($pro_tem_expiration_date !== NULL) && new DateTime($pro_tem_expiration_date) > $today)
  {
    $second_result = pg_query($conn, "SELECT first_name, last_name from people where id = {$row['pro_tem_person_id']}");
    $pro_tem_person = pg_fetch_assoc($second_result);
    $pro_tem_person_id = $row['pro_tem_person_id'];
    $pro_tem_person_name = $pro_tem_person['first_name'].' '.$pro_tem_person['last_name'];
    pg_free_result($second_result);
  }
  if ( $row['is_faculty_seat'] === 't' )
  {
    $faculty_seats[] = new CommitteeSeat($row['seat_id'], $row['committee_id'], $row['person_id'],
    $row['committee_name'], $row['abbreviation'],
    $row['election_date'], $row['expiration_date'], $row['renewal_received'],
    $row['is_faculty_seat'], $row['is_instructional_faculty_seat'],
    $row['is_undergraduate_student_seat'], $row['is_graduate_student_seat'], $row['is_evening_student_seat'],
    $row['first_name'].' '.$row['last_name'], 
    $pro_tem_person_id, $pro_tem_person_name, $row['pro_tem_expiration_date'], $row['is_chair'],
    $row['is_subcommittee'], $row['is_college'], $row['is_special'], $row['is_standing']);
  }
  else
  {
    $student_seats[] = new CommitteeSeat($row['seat_id'], $row['committee_id'], $row['person_id'],
    $row['committee_name'], $row['abbreviation'],
    $row['election_date'], $row['expiration_date'], $row['renewal_received'],
    $row['is_faculty_seat'], $row['is_instructional_faculty_seat'],
    $row['is_undergraduate_student_seat'], $row['is_graduate_student_seat'], $row['is_evening_student_seat'],
    $row['first_name'].' '.$row['last_name'], 
    $pro_tem_person_id, $pro_tem_person_name, $row['pro_tem_expiration_date'], $row['is_chair'],
    $row['is_subcommittee'], $row['is_college'], $row['is_special'], $row['is_standing']);
  }
}

pg_free_result($result);

//  generateFacultyRows()
//  -----------------------------------------------------------------------------------------------------------------
/*
 *  Generate an html table row for each faculty opening. Add headings as necessary.
 */
  function generateFacultyRows()
  {
    global $faculty_seats, $conn, $this_committee_id, $this_committee_type, $num_seats;

    if (count($faculty_seats) == 0)
    {
      echo "<tr><td colspan='5' class='dbError'>Error: No faculty seats!</td></tr>\n";
    }

    // Get number of faculty seats on each committee for row span of committee name column
    $result = pg_query($conn, "SELECT committee_id, count(*) AS num_seats FROM seats"
                            . " WHERE is_faculty_seat AND is_current GROUP BY committee_id");
    $num_seats = array();
    while ($row = pg_fetch_assoc($result))
    {
      $num_seats[$row['committee_id']] = $row['num_seats'];
    }
    pg_free_result($result);
    $this_committee_id = 0;
    $this_committee_type = "";
    $even_numbered_committee = false;

    // Generate the table body
    foreach ($faculty_seats as $seat)
    {
      generateRow($seat, true);
    }
    echo "      </tbody>\n";
  }

//  generateStudentRows()
//  ------------------------------------------------------------------------------------------------------------
  function generateStudentRows()
  {
    global $student_seats, $conn, $this_committee_id, $this_committee_type, $num_seats;
    if (count($student_seats) == 0)
    {
      echo "<tr><td colspan='5' class='dbError'>Error: No student seats!</td></tr>\n";
    }
    // Get number of student seats on each committee for row span of committee name column
    $result = pg_query($conn, "SELECT committee_id, count(*) AS num_seats FROM seats"
                            . " WHERE is_current AND NOT is_faculty_seat GROUP BY committee_id");
    $num_seats = array();
    while ($row = pg_fetch_assoc($result))
    {
      $num_seats[$row['committee_id']] = $row['num_seats'];
    }
    pg_free_result($result);
    $this_committee_id = 0;
    $this_committee_type = '';
    $even_numbered_committee = false;

    // Generate the table body
    foreach ($student_seats as $seat)
    {
      generateRow($seat, false);
    }
    echo "      </tbody>\n";
  }

//  generateRow()
//  ----------------------------------------------------------------------------------------------------------
/*  Generates table rows, inserting heading rows for commmittees and committee types as necessary.
 */
    function generateRow($seat, $is_faculty_seat)
    {
      global $todayPlusThreeMonths, $this_committee_id, $this_committee_type, $num_seats, $show_only_open_seats, 
             $even_numbered_committee;
      $chairText = '';
      $rowClass = new HTML_Attribute('class');
      if (preg_match("/OPEN/", $seat->person_name)) $rowClass->addValue('open-seat');
      $seatClass = new HTML_Attribute('class');
      if ($is_faculty_seat) $seatClass->addValue("faculty-seat");
      $seatClass->addValue("person-id:{$seat->person_id}");
      $seatClass->addValue('seat-holder');
      if ($seat->pro_tem_person_id !== null)
      {
        $seatClass->addValue("pro-tem");
        $seatClass->addValue("pro-tem-id:{$seat->pro_tem_person_id}");
      }
      if ($seat->isChair)
      {
        $chairText = ' (Chair)';
        $seatClass->addValue('chair');
      }
      if ($seat->expirationDate < $todayPlusThreeMonths)
      {
        if ($seat->renewalReceived)
        {
          $seatClass->addValue('renewal-received');
        }
        else
        {
          $seatClass->addValue('expiring');
        }
      }
      //  Is this the first row for a committee?
      if ( $this_committee_id != $seat->committee_id )
      {
        if ($this_committee_id != '')
        {
          echo <<<EOT
        </tbody>

EOT;
        }
        //  Is this the first committee of this type?
        if ($this_committee_type != $seat->committee_type)
        {
          //Generate header rows for the committee type
          $even_numbered_committee = false;
          echo <<<EOT

        <tbody class="type-heading">
          <tr class="type-heading-row-1">
            <th class="type-heading-cell" colspan='5'>{$seat->committee_type}</th>
          </tr>
          <tr class="type-heading-row-2">
            <th class="type-heading-cell">Committee Name</th>
            <th class="type-heading-cell">Seat ID</th>
            <th class="type-heading-cell">Division</th>
            <th class="type-heading-cell">Expiration</th>
            <th class="type-heading-cell">Seat Holder</th>
          </tr>
        </tbody>

EOT;
        $this_committee_type = $seat->committee_type;
        }
        $rowClass->addValue('start-committee');

        // Generate the committee name cell
        $even_numbered_committee = !$even_numbered_committee;
        $even_odd_class = $even_numbered_committee ? 'even-numbered' : 'odd-numbered';
        echo <<<EOT
        <tbody class="committee-body $even_odd_class">
          <tr{$rowClass}>
            <th scope='row' rowspan='{$num_seats[$seat->committee_id]}'>{$seat->committee_name}</th>

EOT;
        $this_committee_id = $seat->committee_id;
      }
      else
      {
        echo <<<EOT
          <tr{$rowClass}>

EOT;
      }
      /*  set title attribute
       *    Depends on whether seat is open, occupied, or occupied pro-tem
       */
      $person_name = $seat->person_name;
      $vacated_or_elected = ($seat->person_id === '1') ? 'Vacated ' : 'Elected ';
      $title_string = " title='{$vacated_or_elected} {$seat->electionDate->format('Y-m-d')}'";
      if ($seat->pro_tem_person_name !== '')
      {
        $title_string = " title='Serving in place of {$person_name} until {$seat->pro_tem_expiration_date->format('Y-m-d')}'";
        $person_name = $seat->pro_tem_person_name;
      }
      echo <<<EOT
            <td>{$seat->seat_id}</td>
            <td>{$seat->divisionRequirement}</td>
            <td class="expiration-date">{$seat->expirationDate->format('M Y')}</td>
            <td{$seatClass}{$title_string}>{$person_name} {$chairText}</td>
          </tr>

EOT;
    }

?>
