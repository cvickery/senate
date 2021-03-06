<?php
/*  $Id: manage_people.php,v 1.2 2009/12/29 05:24:26 vickery Exp vickery $
 *
 *  $Log: manage_people.php,v $
 *  Revision 1.2  2009/12/29 05:24:26  vickery
 *  Whitespace and bug fixes.
 *  Restrict administrative access to administrators.
 *
 *  Revision 1.1  2009/11/01 04:55:15  vickery
 *  Initial revision
 *
 *
 */

require_once 'strip_quotes.php'  ;
session_start();
require_once './credentials.php' ;

//  Class Person
//  -------------------------------------------------------------------------------------
class Person
{
  //  json_encode() encodes only public members, so all fields are public.
  public $id = 0;
  public $last_name;
  public $first_name;
  public $qc_email, $alternate_email,
          $work_address, $home_address, $work_phone, $home_phone, $cell_phone;
  public  $is_faculty, $is_instructional_faculty, $is_undergraduate_student, $is_graduate_student,
          $is_evening_student, $is_foreign_student, $student_id;
  public  $department_id, $first_major_id, $second_major_id, $graduate_major_id;

  //  Constructor
  function __construct($id, $last_name, $first_name, $qc_email, $alternate_email,
                        $work_address, $home_address, $home_phone, $work_phone, $cell_phone,
                        $is_faculty, $is_instructional_faculty, 
                        $is_undergraduate_student, $is_graduate_student, $is_evening_student, $is_foreign_student, $student_id,
                        $department_id, $first_major_id, $second_major_id, $graduate_major_id)
  {
    $this->id = $id;
    $this->last_name = $last_name;
    $this->first_name = $first_name;
    $this->qc_email = $qc_email;
    $this->alternate_email = $alternate_email;
    $this->home_phone = $home_phone;
    $this->work_phone = $work_phone;
    $this->cell_phone = $cell_phone;
    $this->home_address = $home_address;
    $this->work_address = $work_address;
    $this->is_faculty = $is_faculty;
    $this->is_instructional_faculty = $is_instructional_faculty;
    $this->is_undergraduate_student = $is_undergraduate_student;
    $this->is_graduate_student = $is_graduate_student;
    $this->is_evening_student = $is_evening_student;
    $this->is_foreign_student = $is_foreign_student;
    $this->student_id = $student_id;
    $this->department_id = $department_id;
    $this->first_major_id = $first_major_id;
    $this->second_major_id = $second_major_id;
    $this->graduate_major_id = $graduate_major_id;
  }

  //  Rudamentary toString()
  function __toString()
  {
    return $this->last_name . ', ' . $this->first_name;
  }
}

//  Determine the type of query
//  ---------------------------------------------------------------------------------

  //  People by name or email
  //  -------------------------------------------------------------------------------
  if ( isset($_POST['whereClause']) )
  {
    $queryResult = pg_query($senate_db, "SELECT * FROM people WHERE " . $_POST['whereClause']);
    $results = array();
    while ( $row = pg_fetch_assoc($queryResult) )
    {
      $results[] = new Person($row['id'], $row['last_name'], $row['first_name'], $row['qc_email'], $row['alternate_email'],
        $row['work_address'], $row['home_address'], $row['home_phone'], $row['work_phone'], $row['cell_phone'],
        $row['is_faculty'], $row['is_instructional_faculty'], 
        $row['is_undergraduate_student'], $row['is_graduate_student'], $row['is_evening_student'], 
        $row['is_foreign_student'], $row['student_id'],
        $row['department_id'], $row['first_undergraduate_major_id'], $row['second_undergraduate_major_id'], $row['graduate_major_id']);
    }
    echo json_encode($results);
    exit();
  }

  //  Add a person
  //  -----------------------------------------------------------------------------
  else if ( isset($_POST['insertRequest']) )
  {
    $requestObject = json_decode($_POST['insertRequest']);
    //  QC email has to be unique, so use NULL for 'missing' value supplied from JS.
    $requestObject->qc_email = ($requestObject->qc_email == 'missing') ? 'NULL' : "'" .$requestObject->qc_email. "'";
    //  JSON encodes booleans as 0 or 1; convert them to db format
    $requestObject->is_faculty = ($requestObject->is_faculty == '1') ? 'true' : 'false';
    $requestObject->is_instructional_faculty = ($requestObject->is_instructional_faculty == '1') ? 'true' : 'false';
    $requestObject->is_undergraduate_student = ($requestObject->is_undergraduate_student == '1') ? 'true' : 'false';
    $requestObject->is_graduate_student = ($requestObject->is_graduate_student == '1') ? 'true' : 'false';
    $requestObject->is_evening_student = ($requestObject->is_evening_student == '1') ? 'true' : 'false';
    $requestObject->is_foreign_student = ($requestObject->is_foreign_student == '1') ? 'true' : 'false';
    $requestObject->is_instructional = ($requestObject->is_instructional_faculty == '1') ? 'true' : 'false';
    // Convert integer strings to numbers or NULL
    $requestObject->department_id = ($requestObject->department_id == '') ? 'NULL' : $requestObject->department_id;
    $requestObject->first_major_id = ($requestObject->first_major_id == '') ? 'NULL' : $requestObject->first_major_id;
    $requestObject->second_major_id = ($requestObject->second_major_id == '') ? 'NULL' : $requestObject->second_major_id;
    $requestObject->graduate_major_id = ($requestObject->graduate_major_id == '') ? 'NULL' : $requestObject->graduate_major_id;
    $requestObject->student_id = ($requestObject->student_id == '') ? 'NULL' : $requestObject->student_id;

    $requestString = <<<EOT
INSERT INTO people
  ( last_name, first_name, qc_email, alternate_email, work_address, home_address, work_phone, home_phone, cell_phone,
    is_faculty, is_instructional_faculty, is_undergraduate_student, is_graduate_student, is_evening_student, is_foreign_student,
    student_id, department_id, first_undergraduate_major_id, second_undergraduate_major_id, graduate_major_id )
VALUES
  (
    '$requestObject->last_name',
    '$requestObject->first_name',
    $requestObject->qc_email,
    '$requestObject->alternate_email',
    '$requestObject->work_address',
    '$requestObject->home_address',
    '$requestObject->work_phone',
    '$requestObject->home_phone',
    '$requestObject->cell_phone',
    $requestObject->is_faculty,
    $requestObject->is_instructional_faculty,
    $requestObject->is_undergraduate_student,
    $requestObject->is_graduate_student,
    $requestObject->is_evening_student,
    $requestObject->is_foreign_student,
    $requestObject->student_id,
    $requestObject->department_id,
    $requestObject->first_major_id,
    $requestObject->second_major_id,
    $requestObject->graduate_major_id
  )
EOT;
  }

  //  Update a person
  //  -----------------------------------------------------------------------------
  else if ( isset($_POST['updateRequest']) )
  {
    $requestObject = json_decode($_POST['updateRequest']);
    //  QC email has to be unique, so use NULL for 'missing' value supplied from JS.
    $requestObject->qc_email = ($requestObject->qc_email == 'missing') ? 'NULL' : "'" .$requestObject->qc_email. "'";
    //  JSON encodes booleans as 0 or 1; convert them to db format
    $requestObject->is_faculty = ($requestObject->is_faculty == '1') ? 'true' : 'false';
    $requestObject->is_instructional_faculty = ($requestObject->is_instructional_faculty == '1') ? 'true' : 'false';
    $requestObject->is_undergraduate_student = ($requestObject->is_undergraduate_student == '1') ? 'true' : 'false';
    $requestObject->is_graduate_student = ($requestObject->is_graduate_student == '1') ? 'true' : 'false';
    $requestObject->is_evening_student = ($requestObject->is_evening_student == '1') ? 'true' : 'false';
    $requestObject->is_foreign_student = ($requestObject->is_foreign_student == '1') ? 'true' : 'false';
    $requestObject->is_instructional = ($requestObject->is_instructional_faculty == '1') ? 'true' : 'false';
    // Convert integer strings to numbers or NULL
    $requestObject->department_id = ($requestObject->department_id == '') ? 'NULL' : $requestObject->department_id;
    $requestObject->first_major_id = ($requestObject->first_major_id == '') ? 'NULL' : $requestObject->first_major_id;
    $requestObject->second_major_id = ($requestObject->second_major_id == '') ? 'NULL' : $requestObject->second_major_id;
    $requestObject->graduate_major_id = ($requestObject->graduate_major_id == '') ? 'NULL' : $requestObject->graduate_major_id;
    $requestObject->student_id = ($requestObject->student_id == '') ? 'NULL' : $requestObject->student_id;

    $requestString = <<<EOT
UPDATE people SET
  last_name = '$requestObject->last_name',
  first_name = '$requestObject->first_name',
  qc_email = $requestObject->qc_email,
  alternate_email = '$requestObject->alternate_email',
  work_address = '$requestObject->work_address',
  home_address = '$requestObject->home_address',
  work_phone = '$requestObject->work_phone',
  home_phone = '$requestObject->home_phone',
  cell_phone = '$requestObject->cell_phone',
  is_faculty = $requestObject->is_faculty,
  is_instructional_faculty = $requestObject->is_instructional_faculty,
  is_undergraduate_student = $requestObject->is_undergraduate_student,
  is_graduate_student = $requestObject->is_graduate_student,
  is_evening_student = $requestObject->is_evening_student,
  is_foreign_student = $requestObject->is_foreign_student,
  student_id = $requestObject->student_id,
  department_id = $requestObject->department_id,
  first_undergraduate_major_id = $requestObject->first_major_id,
  second_undergraduate_major_id = $requestObject->second_major_id,
  graduate_major_id = $requestObject->graduate_major_id
WHERE id = $requestObject->id
EOT;
  }
  else
  {
    var_dump($_POST);
    exit();
  }

  // Do the INSERT or UPDATE operation
    $queryResult = pg_query($senate_db, $requestString);
//echo "requestString: $requestString";
//echo "pg_affected_rows: ".pg_affected_rows($queryResult);
    if (pg_affected_rows($queryResult) == 1)
    {
      echo pg_affected_rows($queryResult);
    }
    else
    {
      echo pg_last_error($senate_db);
    }

?>
