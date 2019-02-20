<?php
  // $Id: do_logoff.php,v 1.3 2010/01/02 06:21:09 vickery Exp vickery $
  /*
   *  Log the user out and redirect them to the logon page.
   *
   *    $Log: do_logoff.php,v $
   *    Revision 1.3  2010/01/02 06:21:09  vickery
   *    Changed 'login_error' to 'login_message in $_SESSION.
   *
   *    Revision 1.2  2009/12/29 05:24:26  vickery
   *    Whitespace and bug fixes.
   *    Restrict administrative access to administrators.
   *
   *
   */
  session_start();
  $level = error_reporting(0);
  unset($_POST['email']);
  unset($_POST['password']);
  unset($_SESSION['person']);
  unset($_SESSION['committees']);
  unset($_SESSION['IS_NOMINATING']);
  unset($_SESSION['login_message']);
  error_reporting($level);
  header("Location: ../login.xhtml");
?>
