<?php
  //  Set up department and major lists
  //  -------------------------------------------------------------------------------
  if ( !isset($departments) )
  {
    $queryResult = pg_query($senate_db, 
        "SELECT divisions.abbreviation as div_abbr, divisions.name as div_name, departments.name as dept_name, departments.id as dept_id "
      . "FROM departments, divisions "
      . "WHERE division_id = divisions.id ORDER BY divisions.abbreviation, departments.name");
      $departments = array();
      while ($row = pg_fetch_assoc($queryResult) )
      {
        $departments[] = array( 'divAbbr'   => $row['div_abbr'], 
                                'divName'   => $row['div_name'], 
                                'deptName'  => $row['dept_name'], 
                                'deptId'    => $row['dept_id']);
      }
  }
  if ( !isset($undergraduate_majors) )
  {
    $queryResult = pg_query($senate_db, 
        "SELECT divisions.abbreviation as div_abbr, divisions.name as div_name, undergraduate_majors.name as major_name, undergraduate_majors.id as major_id "
      . "FROM undergraduate_majors, divisions "
      . "WHERE division_id = divisions.id ORDER BY divisions.name, undergraduate_majors.name");
      $undergraduate_majors = array();
      while ($row = pg_fetch_assoc($queryResult) )
      {
        $undergraduate_majors[] = array('divAbbr' => $row['div_abbr'], 'divName' => $row['div_name'], 'majorName' => $row['major_name'],
                                        'majorId' => $row['major_id']);
      }
  }
  if ( !isset($graduate_majors) )
  {
    $queryResult = pg_query($senate_db, 
        "SELECT"
      . "  divisions.abbreviation as div_abbr, divisions.name as div_name, "
      . "  graduate_majors.name as major_name, graduate_majors.id as major_id "
      . "FROM graduate_majors, divisions "
      . "WHERE division_id = divisions.id ORDER BY divisions.name, graduate_majors.name");
      $graduate_majors = array();
      while ($row = pg_fetch_assoc($queryResult) )
      {
        $graduate_majors[] = array('divAbbr' => $row['div_abbr'], 'divName' => $row['div_name'], 'majorName' => $row['major_name'],
                                    'majorId' => $row['major_id']);
      }
  }
?>
