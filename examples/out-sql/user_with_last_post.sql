DROP VIEW IF EXISTS `user_with_last_post` ;
CREATE VIEW `user_with_last_post` AS
SELECT
  `u`.`id` AS `user_id`,
  `u`.`name` AS `user_name`,
  p.id AS `post_count`
FROM `users` AS `u`
LEFT JOIN `posts` AS `p` ON u.id = p.user_id AND p.id = (SELECT   sq1.id AS id FROM posts AS sq1  WHERE user_id=u.id    ORDER BY id DESC  LIMIT 1)

GROUP BY u.id, u.name;