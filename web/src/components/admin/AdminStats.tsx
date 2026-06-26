import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { IoPeople, IoRestaurant, IoCart } from "react-icons/io5";
import { Card, CardContent } from "../custom/Card";
import { Spinner } from "../custom/Spinner";

const ADMIN_STATS = gql`
  query AdminStats {
    totalUsers
    restaurants {
      id
    }
  }
`;

export function AdminStats() {
  const { data, loading } = useQuery(ADMIN_STATS);

  if (loading) {
    return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  }

  const totalUsers = data?.totalUsers || 0;
  const totalRestaurants = data?.restaurants?.length || 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <IoPeople className="text-primary" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalUsers}</p>
            <p className="text-sm text-muted-foreground">Usuarios totales</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <IoRestaurant className="text-primary" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalRestaurants}</p>
            <p className="text-sm text-muted-foreground">Restaurantes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
