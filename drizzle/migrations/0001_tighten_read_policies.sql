DROP POLICY IF EXISTS "signed-in read complaints" ON public.complaints;
CREATE POLICY "owner or staff read complaints" ON public.complaints FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'inspector'));

DROP POLICY IF EXISTS "read sensors" ON public.sensors;
CREATE POLICY "staff roles read sensors" ON public.sensors FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()));

DROP POLICY IF EXISTS "profiles readable by signed-in" ON public.profiles;
CREATE POLICY "own profile or admin read" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));