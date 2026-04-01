DROP VIEW IF EXISTS `user_post_summary` ;
CREATE VIEW `user_post_summary` AS
SELECT
  `u`.`id` AS `user_id`,
  `u`.`name` AS `user_name`,
  COUNT(p.id) AS `post_count`
FROM `users` AS `u`
LEFT JOIN `posts` AS `p` ON u.id = p.user_id

GROUP BY u.id, u.name;