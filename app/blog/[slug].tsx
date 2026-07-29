import PostScreen from "../../screens/PostScreen";

// Public, comme /blog/[slug] sur le site - pas de verification de session.
export default function BlogPost() {
  return <PostScreen />;
}
