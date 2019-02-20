<?php
//  $Id: utilities.php,v 1.4 2010/01/02 06:23:47 vickery Exp vickery $
/*
 *    Gets information about a person and initializes two associative arrays:
 *      $_SESSION['person'] Everything from the people table for the person;
 *      or not set if the person is not there.
 *      $_SESSION['committees'] Committees the person is a member/chair of.
 *    Also sets $_SESSION['IS_NOMINATING'] if the person is a member of the
 *    Nominating Committee.
 *
 *    $Log: utilities.php,v $
 *    Revision 1.4  2010/01/02 06:23:47  vickery
 *    Added clarifying parens to an if statement.
 *
 *    Revision 1.3  2009/12/29 05:22:38  vickery
 *    Whitespace and bug fixes.
 *
 *    Revision 1.2  2009/12/28 05:44:58  vickery
 *    Changed global name of db connection; changed session variable
 *    name to IS_NOMINATING.
 *
 *    Revision 1.1  2009/11/24 06:00:09  vickery
 *    Initial revision
 *
 */
  function lookup_user($email, $password)
  {
    global $senate_db;
    
    $_SESSION['IS_NOMINATING'] = false;
    if (isset($_SESSION['person'])) unset($_SESSION['person']);
    if (!preg_match("/^\s*[\w\.\-]+@[\w\.\-]+\s*$/", $email))
    {
      return;
    }
    $sha1 = sha1($password);
    $query =  "SELECT * FROM people "
             ."  WHERE (qc_email ~* '$email' OR alternate_email ~* '$email') AND "
             ."  (password is null OR password='$sha1')";
    $result = pg_query($senate_db, $query);
    switch (pg_num_rows($result))
    {
      case 0:
          break;
      case 1:
          $_SESSION['person'] = pg_fetch_assoc($result);
          break;
      default:
          die(pg_num_rows($result) . " matches returned from email lookup.");
          break;
    }
    $_SESSION['committees'] = array();
    if (isset($_SESSION['person']))
    {
      $id = $_SESSION['person']['id'];
      $query = "SELECT abbreviation, chair_id FROM committees, seats "
              ."  WHERE person_id = '$id' AND committees.id = committee_id AND is_current";
      $result = pg_query($senate_db, $query);
      $num_rows = pg_num_rows($result);
      while ($row = pg_fetch_assoc($result))
      {
        $_SESSION['committees'][] = array( 'name' =>    $row['abbreviation'],
                                           'is_chair' => ($row['chair_id'] === $_SESSION['person']['id']) ? true : false
                                         );
        if ($row['abbreviation'] === "Nominating") $_SESSION['IS_NOMINATING'] = true;
      }
    }
  }
?>
