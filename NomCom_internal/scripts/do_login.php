<?php
// $Id: do_login.php,v 1.4 2010/01/08 04:06:54 vickery Exp vickery $
/*
 *  Be sure no one is logged in, and process the login form data
 *
 *    $Log: do_login.php,v $
 *    Revision 1.4  2010/01/08 04:06:54  vickery
 *    Added support for the requested_page session variable so the user
 *    does not have to go through the index page when going to a bookmarked
 *    restricted page.
 *
 *    Revision 1.3  2010/01/02 06:25:20  vickery
 *    Added support for creating/changing password.
 *
 *    Revision 1.2  2009/12/29 05:24:26  vickery
 *    Whitespace and bug fixes.
 *    Restrict administrative access to administrators.
 *
 *    Revision 1.1  2009/12/28 05:46:42  vickery
 *    Initial revision
 *
 *
 */
  //  Be sure no one is logged in.
  session_start();
  $level = error_reporting(0);
  unset($_SESSION['person']);
  unset($_SESSION['committees']);
  unset($_SESSION['IS_NOMINATING']);
  unset($_SESSION['login_message']);
  error_reporting($level);
  
  //  Process the login form data
include_once("credentials.php");
include_once("utilities.php");
  lookup_user($_POST['email'], $_POST['password']);
  if (isset($_SESSION['person']) && ($_SESSION['IS_NOMINATING'] || ($_SESSION['person']['is_db_admin'] === 't')))
  {
    //  Successful login; check if user is changing passwords
    if ( ($_POST['password1'] !== '') || ($_POST['password2'] !== '') )
    {
      if ($_POST['password1'] === $_POST['password2'])
      {
        $query = "UPDATE people set password = '" . sha1($_POST['password1']) . "' WHERE id = " .$_SESSION['person']['id'];
        $result = pg_query ($senate_db, $query);
        if (pg_affected_rows($result) !== 1)
        {
          $_SESSION['login_message'] = "Password change failed ";
        }
        else
        {
          $_SESSION['login_message'] = "Password change succeeded. Please log in using your new password.";
        }
      }
      else
      {
        $_SESSION['login_message'] = "New and Repeat passwords do not match.";
      }
      header("Location: ../login.xhtml");
    }
    else
    {
      //  Successful login: go directly to requested page if there was one
      $_SESSION['login_message'] = false;
      if (isset($_SESSION['requested_page']))
      {
        header("Location: {$_SESSION['requested_page']}");
      }
      else
      {
        header("Location: ../index.xhtml");
      }
    }
  }
  else
  {
    $_SESSION['login_message'] = "Unrecognized email/password";
    header("Location: ../login.xhtml");
  }
?>
